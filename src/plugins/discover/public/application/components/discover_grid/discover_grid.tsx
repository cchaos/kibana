/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import './discover_grid.scss';
import { i18n } from '@kbn/i18n';
import {
  EuiDataGrid,
  EuiIcon,
  EuiScreenReaderOnly,
  EuiSpacer,
  EuiText,
  htmlIdGenerator,
} from '@elastic/eui';
import { IndexPattern } from '../../../kibana_services';
import { DocViewFilterFn, ElasticSearchHit } from '../../doc_views/doc_views_types';
import { getDefaultSort } from '../../angular/doc_table/lib/get_default_sort';
import {
  getEuiGridColumns,
  getPopoverContents,
  getSchemaDetectors,
  getVisibleColumns,
} from './discover_grid_helpers';
import { DiscoverGridFlyoutSelection } from './discover_grid_flyout_selection';
import { DiscoverGridFlyout } from './discover_grid_flyout';
import { DiscoverGridToolbarSelection } from './discover_grid_toolbar_selection';
import { DiscoverGridContext } from './discover_grid_context';
import { DiscoverGridSelectButton } from './discover_grid_select_button';
import { ViewButton } from './discover_grid_view_button';
import { getRenderCellValueFn } from './get_render_cell_value';

type Direction = 'asc' | 'desc';
type SortArr = [string, Direction];
interface SortObj {
  id: string;
  direction: Direction;
}

interface Props {
  ariaLabelledBy: string;
  columns: string[];
  columnsWidth: any;
  getContextAppHref: (id: string) => string;
  indexPattern: IndexPattern;
  onAddColumn: (column: string) => void;
  onFilter: DocViewFilterFn;
  onRemoveColumn: (column: string) => void;
  onResize?: (colSettings: { columnId: string; width: number }) => void;
  onSetColumns: (columns: string[]) => void;
  onSort: (props: any) => void;
  rows?: ElasticSearchHit[];
  sampleSize: number;
  searchDescription?: string;
  searchTitle?: string;
  showTimeCol: boolean;
  sort: SortArr[];
  useDocSelector: boolean;
}

const gridStyle = {
  border: 'horizontal',
  fontSize: 's',
  cellPadding: 's',
  rowHover: 'none',
};
const pageSizeArr = [25, 50, 100, 500];
const defaultPageSize = 50;

export const EuiDataGridMemoized = React.memo((props: any) => <EuiDataGrid {...props} />);

export const DiscoverGrid = React.memo(
  ({
    rows,
    columns,
    columnsWidth,
    sort,
    indexPattern,
    ariaLabelledBy,
    searchTitle,
    searchDescription,
    onSort,
    onResize,
    sampleSize,
    onFilter,
    getContextAppHref,
    onRemoveColumn,
    onAddColumn,
    showTimeCol,
    onSetColumns,
    useDocSelector,
  }: Props) => {
    const [showSelected, setShowSelected] = useState(false);
    const [selected, setSelected] = useState<number[]>([]);
    const [viewed, setViewed] = useState<number>(-1);
    const timeString = useMemo(
      () =>
        i18n.translate('discover.timeLabel', {
          defaultMessage: 'Time',
        }),
      []
    );

    /**
     * Pagination
     */
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: defaultPageSize });

    const paginationObj = useMemo(() => {
      const onChangeItemsPerPage = (pageSize: number) =>
        setPagination((paginationData) => ({ ...paginationData, pageSize }));

      const onChangePage = (pageIndex: number) =>
        setPagination((paginationData) => ({ ...paginationData, pageIndex }));

      return {
        ...pagination,
        onChangeItemsPerPage,
        onChangePage,
        pageSizeOptions: pageSizeArr,
      };
    }, [pagination]);

    /**
     * Sorting
     */
    const sortingColumns = useMemo(() => {
      return sort.length === 0
        ? getDefaultSort(indexPattern).map(
            ([id, direction]) => ({ id, direction } as { id: string; direction: 'asc' | 'desc' })
          )
        : sort.map(([id, direction]) => ({ id, direction }));
    }, [sort, indexPattern]);

    const onTableSort = useCallback(
      (sortingColumnsData) => {
        onSort(sortingColumnsData.map(({ id, direction }: SortObj) => [id, direction]));
      },
      [onSort]
    );

    /**
     * Cell rendering
     */
    const renderCellValue = useMemo(() => getRenderCellValueFn(indexPattern, rows), [
      rows,
      indexPattern,
    ]);

    const toolbarVisibility = {
      showColumnSelector: {
        allowHide: false,
        allowReorder: true,
      },
      showStyleSelector: false,
      additionalControls: useDocSelector ? <DiscoverGridToolbarSelection /> : undefined,
    };

    /**
     * Render variables
     */
    const rowsLength = rows ? rows.length : 0;
    const pageCount = Math.ceil(rowsLength / pagination.pageSize);
    const isOnLastPage = pagination.pageIndex === pageCount - 1;
    const showDisclaimer = rowsLength === sampleSize && isOnLastPage;
    const randomId = useMemo(() => String(htmlIdGenerator()), []);

    const rowCount = useMemo(() => (rows ? rows.length : 0), [rows]);
    const euiGridColumns = useMemo(
      () => getEuiGridColumns(columns, columnsWidth, indexPattern, showTimeCol, timeString),
      [columns, indexPattern, showTimeCol, timeString, columnsWidth]
    );
    const schemaDetectors = useMemo(() => getSchemaDetectors(), []);
    const popoverContents = useMemo(() => getPopoverContents(), []);
    const colummsVisibility = useMemo(
      () => ({
        visibleColumns: getVisibleColumns(columns, indexPattern, showTimeCol) as string[],
        setVisibleColumns: (newColumns: string[]) => {
          onSetColumns(newColumns);
        },
      }),
      [columns, indexPattern, showTimeCol, onSetColumns]
    );
    const sorting = useMemo(() => ({ columns: sortingColumns, onSort: onTableSort }), [
      sortingColumns,
      onTableSort,
    ]);
    const lead = useMemo(() => {
      if (!rows) {
        return [];
      }
      return [
        useDocSelector
          ? {
              id: 'checkBox',
              width: 31,
              headerCellRender: () => (
                <EuiScreenReaderOnly>
                  <span>
                    {i18n.translate('discover.selectColumnHeader', {
                      defaultMessage: 'Select column',
                    })}
                  </span>
                </EuiScreenReaderOnly>
              ),
              rowCellRender: (col: number) => <DiscoverGridSelectButton col={col} rows={rows} />,
            }
          : null,
        {
          id: 'openDetails',
          width: 31,
          headerCellRender: () => (
            <EuiScreenReaderOnly>
              <span>
                {i18n.translate('discover.controlColumnHeader', {
                  defaultMessage: 'Control column',
                })}
              </span>
            </EuiScreenReaderOnly>
          ),
          rowCellRender: ViewButton,
        },
      ].filter((obj) => !!obj);
    }, [rows, useDocSelector]);

    if (!rowCount || !rows) {
      return (
        <I18nProvider>
          <div className="euiDataGrid__noResults">
            <EuiText size="xs" color="subdued">
              <EuiIcon type="discoverApp" size="m" color="subdued" />
              <EuiSpacer size="s" />
              <FormattedMessage id="discover.noResultsFound" defaultMessage="No results found" />
            </EuiText>
          </div>
        </I18nProvider>
      );
    }

    return (
      <I18nProvider>
        <DiscoverGridContext.Provider
          value={{ selected, setSelected, showSelected, setShowSelected, viewed, setViewed }}
        >
          <>
            <EuiDataGridMemoized
              aria-labelledby={ariaLabelledBy}
              aria-describedby={randomId}
              sorting={sorting}
              rowCount={rowCount}
              columns={euiGridColumns}
              renderCellValue={renderCellValue}
              leadingControlColumns={lead}
              columnVisibility={colummsVisibility}
              pagination={paginationObj}
              toolbarVisibility={toolbarVisibility}
              gridStyle={gridStyle}
              schemaDetectors={schemaDetectors}
              popoverContents={popoverContents}
              onColumnResize={(col: { columnId: string; width: number }) => {
                if (onResize) {
                  onResize(col);
                }
              }}
            />

            {showDisclaimer && (
              <p className="dscTable__footer">
                <FormattedMessage
                  id="discover.howToSeeOtherMatchingDocumentsDescriptionGrid"
                  defaultMessage="These are the first {sampleSize} documents matching your search, refine your search to see others."
                  values={{ sampleSize }}
                />
                <a href={`#${ariaLabelledBy}`}>
                  <FormattedMessage id="discover.backToTopLinkText" defaultMessage="Back to top." />
                </a>
              </p>
            )}
            {searchTitle && (
              <EuiScreenReaderOnly>
                <p id={String(randomId)}>
                  {searchDescription ? (
                    <FormattedMessage
                      id="discover.searchGenerationWithDescriptionGrid"
                      defaultMessage="Table generated by search {searchTitle} ({searchDescription})"
                      values={{ searchTitle, searchDescription }}
                    />
                  ) : (
                    <FormattedMessage
                      id="discover.searchGenerationWithDescription"
                      defaultMessage="Table generated by search {searchTitle}"
                      values={{ searchTitle }}
                    />
                  )}
                </p>
              </EuiScreenReaderOnly>
            )}
            {viewed > -1 && rows[viewed] && (
              <DiscoverGridFlyout
                indexPattern={indexPattern}
                getContextAppHref={getContextAppHref}
                hit={rows[viewed]}
                columns={columns}
                onFilter={onFilter}
                onRemoveColumn={onRemoveColumn}
                onAddColumn={onAddColumn}
                onClose={() => {
                  setViewed(-1);
                }}
              />
            )}
            {showSelected && selected && selected.length > 0 && (
              <DiscoverGridFlyoutSelection
                indexPattern={indexPattern}
                rows={rows}
                selected={selected}
                onClose={() => setShowSelected(false)}
              />
            )}
          </>
        </DiscoverGridContext.Provider>
      </I18nProvider>
    );
  }
);
