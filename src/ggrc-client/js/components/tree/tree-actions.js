/*
  Copyright (C) 2018 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import '../three-dots-menu/three-dots-menu';
import {
  isMyAssessments,
} from '../../plugins/utils/current-page-utils';
import {
  isSnapshotModel,
  isSnapshotScope,
} from '../../plugins/utils/snapshot-utils';
import template from './templates/tree-actions.mustache';

export default can.Component.extend({
  tag: 'tree-actions',
  template,
  viewModel: {
    define: {
      addItem: {
        type: String,
        get: function () {
          return this.attr('options.objectVersion') ?
            false :
            this.attr('options').add_item_view ||
            this.attr('model').tree_view_options.add_item_view;
        },
      },
      show3bbs: {
        type: Boolean,
        get: function () {
          return !isMyAssessments();
        },
      },
      isSnapshots: {
        type: Boolean,
        get: function () {
          let parentInstance = this.attr('parentInstance');
          let model = this.attr('model');

          return (isSnapshotScope(parentInstance) &&
            isSnapshotModel(model.model_singular)) ||
            this.attr('options.objectVersion');
        },
      },
      showGenerateAssessments: {
        type: Boolean,
        get: function () {
          let parentInstance = this.attr('parentInstance');
          let model = this.attr('model');

          return parentInstance.type === 'Audit' &&
            model.shortName === 'Assessment';
        },
      },
      showBulkUpdate: {
        type: 'boolean',
        get: function () {
          return this.attr('options.showBulkUpdate');
        },
      },
    },
    parentInstance: null,
    options: null,
    model: null,
    showedItems: [],
  },
});
