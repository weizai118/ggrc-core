/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import template from './inner-nav.stache';
import './inner-nav-item';
import './inner-nav-collapse';
import '../add-tab-button/add-tab-button';
import {
  getPageInstance,
  isAdmin,
} from '../../plugins/utils/current-page-utils';
import {getCounts} from '../../plugins/utils/widgets-utils';
import router, {buildUrl} from '../../router';
import {isObjectVersion} from '../../plugins/utils/object-versions-utils';
import {isDashboardEnabled} from '../../plugins/utils/dashboards-utils';

export default can.Component.extend({
  tag: 'inner-nav',
  template,
  viewModel: {
    define: {
      instance: {
        get() {
          return getPageInstance();
        },
      },
      counts: {
        get() {
          return getCounts();
        },
      },
      isAuditScope: {
        get() {
          return this.attr('instance.type') === 'Audit';
        },
      },
      showTabs: {
        get() {
          let counts = this.attr('counts');
          let isEmptyCounts = can.isEmptyObject(counts.attr());
          return !isEmptyCounts || isAdmin();
        },
      },
    },
    activeWidget: null,
    widgetDescriptors: [],
    widgetList: [],
    priorityTabs: [],
    notPriorityTabs: [],
    hasHiddenWidgets: false,
    /**
     * Converts all descriptors to tabs view models
     */
    handleDescriptors() {
      let descriptors = this.attr('widgetDescriptors');
      let widgets = _.map(descriptors,
        (descriptor) => this.createWidget(descriptor));

      widgets = _.sortBy(widgets, ['order', 'title']);

      this.attr('widgetList', widgets);
    },
    /**
     * Creates tab's view model
     * @param {Objbect} descriptor widget descriptor
     * @return {Object} view model
     */
    createWidget(descriptor) {
      let id = descriptor.widget_id;
      let widgetName = descriptor.widget_name;
      let title = typeof widgetName === 'function'
        ? widgetName() : widgetName;
      let countsName = descriptor.countsName ||
        (descriptor.content_controller_options &&
          descriptor.content_controller_options.countsName) ||
        descriptor.model.shortName;
      let model = this.attr('instance').constructor;
      let forceShowList = model.obj_nav_options.force_show_list || [];

      let widget = {
        id,
        title,
        type: isObjectVersion(id) ? 'version' : '',
        icon: descriptor.widget_icon,
        href: buildUrl({widget: id}),
        model: descriptor.model,
        order: descriptor.order,
        uncountable: descriptor.uncountable,
        forceRefetch: descriptor.forceRefetch,
        hasCount: false,
        count: 0,
        countsName: !descriptor.uncountable ? countsName : '',
        forceShow: false,
        inForceShowList: _.includes(forceShowList, title),
        placeInAddTab: false,
      };

      return widget;
    },
    /**
     * Splits tabs by priority for Audit
     */
    setTabsPriority() {
      let widgets = this.attr('widgetList');
      let instance = this.attr('instance');

      if (this.attr('isAuditScope')) {
        let priorityTabsNum = 5 + isDashboardEnabled(instance);
        this.attr('priorityTabs', widgets.slice(0, priorityTabsNum));
        this.attr('notPriorityTabs', widgets.slice(priorityTabsNum));
      } else {
        this.attr('priorityTabs', widgets);
      }
    },
    /**
     * Configures widgets to display in Add Tab button dropdown
     */
    updateHiddenWidgets() {
      let hasHiddenWidgets = false;
      let model = this.attr('instance').constructor;
      let showAllTabs = model.obj_nav_options.show_all_tabs;

      // Update has hidden widget attr
      this.attr('widgetList').forEach((widget) => {
        widget.attr('placeInAddTab', false);

        if (widget.hasCount && widget.count === 0 &&
          !widget.forceShow && !widget.inForceShowList && !showAllTabs) {
          widget.attr('placeInAddTab', true);
          hasHiddenWidgets = true;
        }
      });
      this.attr('hasHiddenWidgets', hasHiddenWidgets);
    },
    /**
     * Handles selecting tab
     * @param {string} widgetId selected widget id
     */
    route(widgetId) {
      let widget = this.findWidgetById(widgetId);
      if (!widget && this.attr('widgetList').length) {
        let widgetId = this.attr('widgetList')[0].id;
        router.attr('widget', widgetId);
        return;
      }

      if (widget) {
        widget.attr('forceShow', true); // to show tabs with 0 count
        this.attr('activeWidget', widget);
        this.dispatch({type: 'activeChanged', widget});
        this.updateHiddenWidgets();
      }
    },
    /**
     * Searches widget by Id in widgetList collection
     * @param {string} widgetId widget id
     * @return {can.Map} widget
     */
    findWidgetById(widgetId) {
      return _.find(this.attr('widgetList'),
        (widget) => widget.id === widgetId);
    },
    /**
     * Searches widget by countName in widgetList collection
     * @param {string} countsName counts name prop in widget
     * @return {can.Map} widget
     */
    findWidgetByCountsName(countsName) {
      return _.find(this.attr('widgetList'),
        (widget) => widget.countsName === countsName);
    },
    /**
     * Sets objects count for widget
     * @param {string} name countsName prop in widget
     * @param {*} count objects count
     */
    setWidgetCount(name, count) {
      let widget = this.findWidgetByCountsName(name);
      if (widget) {
        widget.attr({
          count,
          hasCount: true,
        });

        this.updateHiddenWidgets();
      }
    },
    /**
     * Handles tab closing
     * @param {Object} event contains closed widget
     */
    closeTab(event) {
      let widget = event.widget;
      widget.attr('forceShow', false);

      let currentWidget = router.attr('widget');
      if (currentWidget === widget.id) {
        router.attr('widget', this.attr('widgetList.0.id')); // Switch to the first widget
      }
    },
  },
  init() {
    this.viewModel.handleDescriptors();
    this.viewModel.setTabsPriority();
  },
  events: {
    inserted() {
      router.bind('widget', (ev, newVal) => {
        this.viewModel.route(newVal);
      });

      this.viewModel.route(router.attr('widget'));
    },
    '{counts} change'(counts, event, name, action, count) {
      this.viewModel.setWidgetCount(name, count);
    },
  },
});
