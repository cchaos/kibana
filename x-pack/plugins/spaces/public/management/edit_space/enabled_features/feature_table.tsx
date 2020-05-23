/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon, EuiInMemoryTable, EuiSwitch, EuiText, IconType } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import _ from 'lodash';
import React, { ChangeEvent, Component } from 'react';
import { FeatureConfig } from '../../../../../../plugins/features/public';
import { Space } from '../../../../common/model/space';
import { ToggleAllFeatures } from './toggle_all_features';

interface Props {
  space: Partial<Space>;
  features: FeatureConfig[];
  onChange: (space: Partial<Space>) => void;
}

export class FeatureTable extends Component<Props, {}> {
  public render() {
    const { space, features } = this.props;

    const items = features.map((feature) => ({
      feature,
      space,
    }));

    return <EuiInMemoryTable columns={this.getColumns()} items={items} />;
  }

  public onChange = (featureId: string) => (e: ChangeEvent<HTMLInputElement>) => {
    const updatedSpace: Partial<Space> = {
      ...this.props.space,
    };

    let disabledFeatures = updatedSpace.disabledFeatures || [];

    const isFeatureEnabled = (e.target as Record<string, any>).checked;
    if (isFeatureEnabled) {
      disabledFeatures = disabledFeatures.filter((feature) => feature !== featureId);
    } else {
      disabledFeatures = _.uniq([...disabledFeatures, featureId]);
    }

    updatedSpace.disabledFeatures = disabledFeatures;
    this.props.onChange(updatedSpace);
  };

  private onChangeAll = (visible: boolean) => {
    const updatedSpace: Partial<Space> = {
      ...this.props.space,
    };

    if (visible) {
      updatedSpace.disabledFeatures = [];
    } else {
      updatedSpace.disabledFeatures = this.props.features.map((feature) => feature.id);
    }

    this.props.onChange(updatedSpace);
  };

  private getColumns = () => [
    {
      field: 'feature',
      name: i18n.translate('xpack.spaces.management.enabledSpaceFeaturesFeatureColumnTitle', {
        defaultMessage: 'Feature',
      }),
      render: (
        feature: FeatureConfig,
        _item: { feature: FeatureConfig; space: Props['space'] }
      ) => {
        return (
          <EuiText>
            <EuiIcon size="m" type={feature.icon as IconType} />
            &ensp; {feature.name}
          </EuiText>
        );
      },
    },
    {
      field: 'space',
      width: '150',
      name: (
        <span>
          <FormattedMessage
            id="xpack.spaces.management.enabledSpaceFeaturesEnabledColumnTitle"
            defaultMessage="Show?"
          />
          <ToggleAllFeatures onChange={this.onChangeAll} />
        </span>
      ),

      render: (spaceEntry: Space, record: Record<string, any>) => {
        const checked = !(
          spaceEntry.disabledFeatures && spaceEntry.disabledFeatures.includes(record.feature.id)
        );

        return (
          <EuiSwitch
            id={record.feature.id}
            checked={checked}
            onChange={this.onChange(record.feature.id) as any}
            label={`${record.feature.name} visible`}
            showLabel={false}
          />
        );
      },
    },
  ];
}
