"use strict";

var _ = require('lodash'),
    Marionette = require('../../../../shim/backbone.marionette'),
    modalViews = require('../../../core/modals/views'),
    round = require('../../../core/utils').round,
    models = require('./models'),
    calcs = require('./calcs'),
    fieldTmpl = require('./templates/field.html'),
    fieldWithLabelTmpl = require('./templates/fieldWithLabel.html'),
    modalTmpl = require('./templates/modal.html'),
    landCoverModalTmpl = require('./templates/landCoverModal.html'),
    landCoverTotalTmpl = require('./templates/landCoverTotal.html'),
    sectionTmpl = require('./templates/section.html'),
    tabContentTmpl = require('./templates/tabContent.html'),
    tabPanelTmpl = require('./templates/tabPanel.html'),
    tripletSectionTmpl = require('./templates/tripletSection.html'),
    tripletTabContentTmpl = require('./templates/tripletTabContent.html');

var LandCoverModal = modalViews.ModalBaseView.extend({
    template: landCoverModalTmpl,

    id: 'land-cover-modal',
    className: 'modal modal-large fade',

    ui: {
        saveButton: '.btn-active',
    },

    events: _.defaults({
        'click @ui.saveButton': 'saveAndClose',
    }, modalViews.ModalBaseView.prototype.events),

    regions: {
        fieldsRegion: '.rows',
        totalRegion: '.total-content',
    },

    initialize: function(options) {
        this.mergeOptions(options, ['addModification']);

        var onFieldUpdated = _.bind(this.onFieldUpdated, this),
            fields = this.model.get('fields');

        this.listenTo(fields, 'change', onFieldUpdated);
    },

    // Override to populate fields
    onRender: function() {
        this.fieldsRegion.show(new FieldsView({
            collection: this.model.get('fields'),
        }));
        this.totalRegion.show(new LandCoverTotalView({
            model: this.model,
        }));

        this.$el.modal('show');
    },

    onFieldUpdated: function() {
        var areas = _.cloneDeep(this.model.get('dataModel')['Area']),
            fields = this.model.get('fields'),
            hasUserValue = function(field) {
                return field.get('userValue') !== null;
            };

        fields.filter(hasUserValue).forEach(function(field) {
            var index = parseInt(field.get('name').split('__')[1]);

            areas[index] = parseFloat(field.get('userValue'));
        });

        this.model.set('userTotal', _.sum(areas));

        this.validateModal();
    },

    validateModal: function() {
        var autoTotal = round(this.model.get('autoTotal'), 1),
            userTotal = round(this.model.get('userTotal'), 1);

        this.ui.saveButton.prop('disabled', autoTotal !== userTotal);
    },

    saveAndClose: function() {
        this.addModification(this.model.getOutput());

        this.hide();
    }
});

var LandCoverTotalView = Marionette.ItemView.extend({
    template: landCoverTotalTmpl,
    templateHelpers: function() {
        var fields = this.model.get('fields'),
            hasUserValue = function(field) {
                return field.get('userValue') !== null;
            },
            autoTotal = round(this.model.get('autoTotal'), 1),
            userTotal = round(this.model.get('userTotal'), 1);

        return {
            is_modified: fields.some(hasUserValue),
            autoTotal: autoTotal,
            userTotal: userTotal,
        };
    },

    modelEvents: {
        'change:userTotal': 'render',
    },
});

var EntryModal = modalViews.ModalBaseView.extend({
    template: modalTmpl,

    id: 'entry-modal',
    className: 'modal modal-large fade',

    ui: {
        saveButton: '.btn-active',
    },

    events: _.defaults({
        'click @ui.saveButton': 'saveAndClose',
    }, modalViews.ModalBaseView.prototype.events),

    regions: {
        panelsRegion: '.tab-panels-region',
        contentsRegion: '.tab-contents-region',
    },

    initialize: function(options) {
        this.mergeOptions(options, ['addModification']);
    },

    // Override to populate tabs
    onRender: function() {
        var tabs = this.model.get('tabs');

        this.panelsRegion.show(new TabPanelsView({
            collection: tabs,
        }));
        this.contentsRegion.show(new TabContentsView({
            collection: tabs,
        }));

        this.$el.modal('show');
    },

    saveAndClose: function() {
        var addModification = this.addModification;

        this.model.get('tabs').forEach(function(tab) {
            addModification(tab.getOutput());
        });

        this.hide();
    }
});

var TabPanelView = Marionette.ItemView.extend({
    tagName: 'li',
    template: tabPanelTmpl,
    attributes: {
        role: 'presentation'
    },
});

var TabPanelsView = Marionette.CollectionView.extend({
    tagName: 'ul',
    className: 'nav nav-tabs',
    attributes: {
        role: 'tablist'
    },

    childView: TabPanelView,

    onRender: function() {
        this.$('li:first').addClass('active');
    },
});

var TabContentView = Marionette.LayoutView.extend({
    className: 'tab-pane',
    template: tabContentTmpl,
    attributes: {
        role: 'tabpanel'
    },

    id: function() {
        return 'entry_' + this.model.get('name');
    },

    regions: {
        sectionsRegion: '.sections-region',
    },

    onShow: function() {
        this.sectionsRegion.show(new SectionsView({
            collection: this.model.get('sections'),
        }));
    },
});

var TripletSectionView = Marionette.LayoutView.extend({
    tagName: 'tr',
    template: tripletSectionTmpl,

    regions: {
        nRegion: '.n-region',
        pRegion: '.p-region',
        sRegion: '.s-region',
    },

    onShow: function() {
        var fields = this.model.get('fields'),
            nModel = fields.findWhere({ label: 'Nitrogen' }),
            pModel = fields.findWhere({ label: 'Phosphorus' }),
            sModel = fields.findWhere({ label: 'Sediment' });

        if (nModel) {
            this.nRegion.show(new FieldView({ model: nModel }));
        }
        if (pModel) {
            this.pRegion.show(new FieldView({ model: pModel }));
        }
        if (sModel) {
            this.sRegion.show(new FieldView({ model: sModel }));
        }
    }
});

var TripletTabContentView = Marionette.CompositeView.extend({
    className: 'tab-pane triplet-tab-pane',
    template: tripletTabContentTmpl,
    attributes: {
        role: 'tabpanel'
    },

    id: function() {
        return 'entry_' + this.model.get('name');
    },

    childView: TripletSectionView,
    childViewContainer: 'tbody',

    initialize: function(args) {
        this.collection = args.model.get('sections');
    },
});

var TabContentsView = Marionette.CollectionView.extend({
    className: 'tab-content',

    getChildView: function(tab) {
        return tab.get('triplet') ? TripletTabContentView : TabContentView;
    },

    onRender: function() {
        this.$('.tab-pane:first').addClass('active');
    },
});

var FieldView = Marionette.ItemView.extend({
    className: 'mapshed-manual-entry',
    template: fieldTmpl,

    ui: {
        input: '.form-control',
        undo: '.btn-undo',
    },

    events: {
        'keyup @ui.input': 'updateUserValue',
        'change select': 'updateUserValue',
        'click @ui.undo': 'resetUserValue',
    },

    templateHelpers: function() {
        var type = this.model.get('type');

        if (type !== models.ENTRY_FIELD_TYPES.NUMERIC) {
            return {};
        }

        var autoValue = this.model.get('autoValue'),
            decimalPlaces = this.model.get('decimalPlaces'),
            // How many decimal places are allowed for the field in the UI
            //   decimalPlaces = 0 => step = 1
            //   decimalPlaces = 1 => step = 0.1
            //   decimalPlaces = 3 => step = 0.001
            // and so on.
            step = Math.pow(10, -decimalPlaces);

        return {
            step: step,
            autoValue: round(autoValue, decimalPlaces),
        };
    },

    onRender: function() {
        this.$('[data-toggle="popover"]').popover();
        this.toggleUserValueState();
    },

    updateUserValue: function() {
        var value = this.ui.input.val();

        this.model.set('userValue', value || null);
        this.toggleUserValueState();
    },

    resetUserValue: function() {
        this.$('[data-toggle="popover"]').popover('destroy');
        this.model.set('userValue', null);
        this.render();
    },

    toggleUserValueState: function() {
        var userValue = this.model.get('userValue');

        if (userValue) {
            this.$el.addClass('has-user-value');
        } else {
            this.$el.removeClass('has-user-value');
        }
    }
});

var FieldWithLabelView = FieldView.extend({
    className: 'row mapshed-manual-entry',
    template: fieldWithLabelTmpl,
});

var FieldsView = Marionette.CollectionView.extend({
    childView: FieldWithLabelView,
});

var SectionView = Marionette.LayoutView.extend({
    template: sectionTmpl,

    regions: {
        fieldsRegion: '.rows',
    },

    onShow: function() {
        this.fieldsRegion.show(new FieldsView({
            collection: this.model.get('fields'),
        }));
    }
});

var SectionsView = Marionette.CollectionView.extend({
    className: 'section',

    childView: SectionView,
});

function showSettingsModal(title, dataModel, modifications, addModification) {
    var tabs = new models.EntryTabCollection([
            {
                name: 'efficiencies',
                displayName: 'Efficiencies',
                triplet: true,
                sections: new models.EntrySectionCollection([
                    {
                        title: 'Cover Crops',
                        fields: models.makeFieldCollection('efficiencies', dataModel, modifications, [
                            {
                                name: 'n63',
                                label: 'Nitrogen',
                                calculator: calcs.Direct,
                                minValue: 0,
                                maxValue: 1,
                            },
                            {
                                name: 'n71',
                                label: 'Phosphorus',
                                calculator: calcs.Direct,
                                minValue: 0,
                                maxValue: 1,
                            },
                            {
                                name: 'n79',
                                label: 'Sediment',
                                calculator: calcs.Direct,
                                minValue: 0,
                                maxValue: 1,
                            },
                        ]),
                    },
                    {
                        title: 'No Till Agriculture',
                        fields: models.makeFieldCollection('efficiencies', dataModel, modifications, [
                            {
                                name: 'n65',
                                label: 'Nitrogen',
                                calculator: calcs.Static(0.11),
                                readOnly: true,
                            },
                            {
                                name: 'n73',
                                label: 'Phosphorus',
                                calculator: calcs.Static(0.29),
                                readOnly: true,
                            },
                            {
                                name: 'n81',
                                label: 'Sediment',
                                calculator: calcs.Static(0.40),
                                readOnly: true,
                            },
                        ]),
                    },
                    {
                        title: 'Conservation Tillage',
                        fields: models.makeFieldCollection('efficiencies', dataModel, modifications, [
                            {
                                name: 'n65',
                                label: 'Nitrogen',
                                calculator: calcs.Static(0.08),
                                readOnly: true,
                            },
                            {
                                name: 'n73',
                                label: 'Phosphorus',
                                calculator: calcs.Static(0.22),
                                readOnly: true,
                            },
                            {
                                name: 'n81',
                                label: 'Sediment',
                                calculator: calcs.Static(0.30),
                                readOnly: true,
                            },
                        ]),
                    },
                    {
                        title: 'Reduced Tillage',
                        fields: models.makeFieldCollection('efficiencies', dataModel, modifications, [
                            {
                                name: 'n65',
                                label: 'Nitrogen',
                                calculator: calcs.Static(0.06),
                                readOnly: true,
                            },
                            {
                                name: 'n73',
                                label: 'Phosphorus',
                                calculator: calcs.Static(0.17),
                                readOnly: true,
                            },
                            {
                                name: 'n81',
                                label: 'Sediment',
                                calculator: calcs.Static(0.23),
                                readOnly: true,
                            },
                        ]),
                    },
                    {
                        title: 'Nutrient Management',
                        fields: models.makeFieldCollection('efficiencies', dataModel, modifications, [
                            {
                                name: 'n70',
                                label: 'Nitrogen',
                                calculator: calcs.Direct,
                                minValue: 0,
                                maxValue: 1,
                            },
                            {
                                name: 'n78',
                                label: 'Phosphorus',
                                calculator: calcs.Direct,
                                minValue: 0,
                                maxValue: 1,
                            },
                        ]),
                    },
                    {
                        title: 'Livestock Waste Management',
                        fields: models.makeFieldCollection('efficiencies', dataModel, modifications, [
                            {
                                name: 'n85h',
                                label: 'Nitrogen',
                                calculator: calcs.Direct,
                                minValue: 0,
                                maxValue: 1,
                            },
                            {
                                name: 'n85i',
                                label: 'Phosphorus',
                                calculator: calcs.Direct,
                                minValue: 0,
                                maxValue: 1,
                            },
                        ]),
                    },
                    {
                        title: 'Poultry Waste Management',
                        fields: models.makeFieldCollection('efficiencies', dataModel, modifications, [
                            {
                                name: 'n85j',
                                label: 'Nitrogen',
                                calculator: calcs.Direct,
                                minValue: 0,
                                maxValue: 1,
                            },
                            {
                                name: 'n85k',
                                label: 'Phosphorus',
                                calculator: calcs.Direct,
                                minValue: 0,
                                maxValue: 1,
                            },
                        ]),
                    },
                    {
                        title: 'Vegetated Buffer Strips',
                        fields: models.makeFieldCollection('efficiencies', dataModel, modifications, [
                            {
                                name: 'n64',
                                label: 'Nitrogen',
                                calculator: calcs.Direct,
                                minValue: 0,
                                maxValue: 1,
                            },
                            {
                                name: 'n72',
                                label: 'Phosphorus',
                                calculator: calcs.Direct,
                                minValue: 0,
                                maxValue: 1,
                            },
                            {
                                name: 'n80',
                                label: 'Sediment',
                                calculator: calcs.Direct,
                                minValue: 0,
                                maxValue: 1,
                            },
                        ]),
                    },
                    {
                        title: 'Streambank Fencing',
                        fields: models.makeFieldCollection('efficiencies', dataModel, modifications, [
                            {
                                name: 'n69',
                                label: 'Nitrogen',
                                calculator: calcs.Direct,
                                minValue: 0,
                                maxValue: 1,
                            },
                            {
                                name: 'n77',
                                label: 'Phosphorus',
                                calculator: calcs.Direct,
                                minValue: 0,
                                maxValue: 1,
                            },
                            {
                                name: 'n85',
                                label: 'Sediment',
                                calculator: calcs.Direct,
                                minValue: 0,
                                maxValue: 1,
                            },
                        ]),
                    },
                    {
                        title: 'Streambank Stabilization',
                        fields: models.makeFieldCollection('efficiencies', dataModel, modifications, [
                            {
                                name: 'n69c',
                                label: 'Nitrogen',
                                calculator: calcs.Direct,
                                minValue: 0,
                                maxValue: 1,
                            },
                            {
                                name: 'n77c',
                                label: 'Phosphorus',
                                calculator: calcs.Direct,
                                minValue: 0,
                                maxValue: 1,
                            },
                            {
                                name: 'n85d',
                                label: 'Sediment',
                                calculator: calcs.Direct,
                                minValue: 0,
                                maxValue: 1,
                            },
                        ]),
                    },
                    {
                        title: 'Surface Water Retention',
                        fields: models.makeFieldCollection('efficiencies', dataModel, modifications, [
                            {
                                name: 'n70b',
                                label: 'Nitrogen',
                                calculator: calcs.Direct,
                                minValue: 0,
                                maxValue: 1,
                            },
                            {
                                name: 'n78b',
                                label: 'Phosphorus',
                                calculator: calcs.Direct,
                                minValue: 0,
                                maxValue: 1,
                            },
                            {
                                name: 'n85c',
                                label: 'Sediment',
                                calculator: calcs.Direct,
                                minValue: 0,
                                maxValue: 1,
                            },
                        ]),
                    },
                    {
                        title: 'Infiltration / Bioretention',
                        fields: models.makeFieldCollection('efficiencies', dataModel, modifications, [
                            {
                                name: 'n71b',
                                label: 'Nitrogen',
                                calculator: calcs.Direct,
                                minValue: 0,
                                maxValue: 1,
                            },
                            {
                                name: 'n79b',
                                label: 'Phosphorus',
                                calculator: calcs.Direct,
                                minValue: 0,
                                maxValue: 1,
                            },
                            {
                                name: 'n79c',
                                label: 'Sediment',
                                calculator: calcs.Direct,
                                minValue: 0,
                                maxValue: 1,
                            },
                        ]),
                    },
                ]),
            },
            {
                name: 'waste_water',
                displayName: 'Waste Water',
                sections: new models.EntrySectionCollection([
                    {
                        title: 'Wastewater Treatment Plants',
                        fields: models.makeFieldCollection('waste_water', dataModel, modifications, [
                            {
                                name: 'PointNitr',
                                label: 'Annual TN Load (kg/yr)',
                                calculator: calcs.EqualMonths,
                                minValue: 0
                            },
                            {
                                name: 'PointPhos',
                                label: 'Annual TP Load (kg/yr)',
                                calculator: calcs.EqualMonths,
                                minValue: 0
                            },
                            {
                                name: 'PointFlow',
                                label: 'Daily Effluent Discharge (MGD)',
                                calculator: calcs.PointSourceDischarge,
                                minValue: 0
                            },
                        ]),
                    },
                    {
                        title: 'Number of Persons on Different Septic System Types',
                        fields: models.makeFieldCollection('waste_water', dataModel, modifications, [
                            {
                                name: 'NumNormalSys',
                                label: 'Normally Functioning Systems',
                                calculator: calcs.Array12,
                                decimalPlaces: 0,
                                minValue: 0
                            },
                            {
                                name: 'NumPondSys',
                                label: 'Surface Failures',
                                calculator: calcs.Array12,
                                decimalPlaces: 0,
                                minValue: 0
                            },
                            {
                                name: 'NumShortSys',
                                label: 'Subsurface Failures',
                                calculator: calcs.Array12,
                                decimalPlaces: 0,
                                minValue: 0
                            },
                            {
                                name: 'NumDischargeSys',
                                label: 'Direct Discharges',
                                calculator: calcs.Array12,
                                decimalPlaces: 0,
                                minValue: 0
                            },
                        ]),
                    },
                ]),
            },
            {
                name: 'animals',
                displayName: 'Animals',
                sections: new models.EntrySectionCollection([
                    {
                        title: 'Animal Populations',
                        fields: models.makeFieldCollection('animals', dataModel, modifications, [
                            {
                                name: 'NumAnimals__0',
                                label: 'Cows, Dairy',
                                calculator: calcs.ArrayIndex,
                                decimalPlaces: 0,
                                minValue: 0
                            },
                            {
                                name: 'GrazingAnimal__0',
                                label: 'Are Dairy Cows allowed to graze?',
                                calculator: calcs.ArrayIndex,
                                type: models.ENTRY_FIELD_TYPES.YESNO
                            },
                            {
                                name: 'NumAnimals__1',
                                label: 'Cows, Beef',
                                calculator: calcs.ArrayIndex,
                                decimalPlaces: 0,
                                minValue: 0
                            },
                            {
                                name: 'GrazingAnimal__1',
                                label: 'Are Beef Cows allowed to graze?',
                                calculator: calcs.ArrayIndex,
                                type: models.ENTRY_FIELD_TYPES.YESNO
                            },
                            {
                                name: 'NumAnimals__2',
                                label: 'Chickens, Broilers',
                                calculator: calcs.ArrayIndex,
                                decimalPlaces: 0,
                                minValue: 0
                            },
                            {
                                name: 'NumAnimals__3',
                                label: 'Chickens, Layers',
                                calculator: calcs.ArrayIndex,
                                decimalPlaces: 0,
                                minValue: 0
                            },
                            {
                                name: 'NumAnimals__4',
                                label: 'Pigs / Hogs / Swine',
                                calculator: calcs.ArrayIndex,
                                decimalPlaces: 0,
                                minValue: 0
                            },
                            {
                                name: 'GrazingAnimal__4',
                                label: 'Are Pigs / Hogs / Swine allowed to graze?',
                                calculator: calcs.ArrayIndex,
                                type: models.ENTRY_FIELD_TYPES.YESNO
                            },
                            {
                                name: 'NumAnimals__5',
                                label: 'Sheep',
                                calculator: calcs.ArrayIndex,
                                decimalPlaces: 0,
                                minValue: 0
                            },
                            {
                                name: 'GrazingAnimal__5',
                                label: 'Are Sheep allowed to graze?',
                                calculator: calcs.ArrayIndex,
                                type: models.ENTRY_FIELD_TYPES.YESNO
                            },
                            {
                                name: 'NumAnimals__6',
                                label: 'Horses',
                                calculator: calcs.ArrayIndex,
                                decimalPlaces: 0,
                                minValue: 0
                            },
                            {
                                name: 'GrazingAnimal__6',
                                label: 'Are Horses allowed to graze?',
                                calculator: calcs.ArrayIndex,
                                type: models.ENTRY_FIELD_TYPES.YESNO
                            },
                            {
                                name: 'NumAnimals__7',
                                label: 'Turkeys',
                                calculator: calcs.ArrayIndex,
                                decimalPlaces: 0,
                                minValue: 0
                            },
                        ]),
                    },
                    {
                        title: 'Populations Served by Animal Waste Management Systems',
                        fields: models.makeFieldCollection('animals', dataModel, modifications, [
                            {
                                name: 'AWMSGrPct',
                                label: 'Fraction of Livestock served by AWMS (0-1)',
                                calculator: calcs.Direct,
                                minValue: 0,
                                maxValue: 1
                            },
                            {
                                name: 'AWMSNgPct',
                                label: 'Fraction of Poultry served by AWMS (0-1)',
                                calculator: calcs.Direct,
                                minValue: 0,
                                maxValue: 1
                            },
                        ]),
                    }
                ]),
            },
            {
                name: 'other',
                displayName: 'Other Model Data',
                sections: new models.EntrySectionCollection([
                    {
                        title: 'Other Model Data',
                        fields: models.makeFieldCollection('other', dataModel, modifications, [
                            {
                                name: 'SedAAdjust',
                                label: 'Streambank Erosion Adjustment Factor (0-2)',
                                calculator: calcs.Direct,
                                minValue: 0,
                                maxValue: 2,
                            },
                            {
                                name: 'SedDelivRatio',
                                label: 'Sediment Delivery Ratio (0-1)',
                                calculator: calcs.Direct,
                                minValue: 0,
                                maxValue: 1,
                            },
                            {
                                name: 'TileDrainDensity',
                                label: 'Fraction of Cropland Tile Drained (0-1)',
                                calculator: calcs.Direct,
                                minValue: 0,
                                maxValue: 1,
                            },
                            {
                                name: 'TileNconc',
                                label: 'Avg. Tile Drain N Concentration (mg/l)',
                                calculator: calcs.Direct,
                                minValue: 0,
                            },
                            {
                                name: 'TilePConc',
                                label: 'Avg. Tile Drain P Concentration (mg/l)',
                                calculator: calcs.Direct,
                                minValue: 0,
                            },
                            {
                                name: 'TileSedConc',
                                label: 'Avg. Tile Drain Sediment Concentration (mg/l)',
                                calculator: calcs.Direct,
                                minValue: 0,
                            },
                            {
                                name: 'GrNitrConc',
                                label: 'Groundwater N Concentration (mg/l)',
                                calculator: calcs.Direct,
                                minValue: 0,
                            },
                            {
                                name: 'GrPhosConc',
                                label: 'Groundwater P Concentration (mg/l)',
                                calculator: calcs.Direct,
                                minValue: 0,
                            },
                            {
                                name: 'ShedAreaDrainLake',
                                label: 'Wetland / Water Filtration Fraction (0-1)',
                                calculator: calcs.Direct,
                                minValue: 0,
                                maxValue: 1,
                            },
                            {
                                name: 'RetentNLake',
                                label: 'N Wetland / Water Retention Fraction (0-1)',
                                calculator: calcs.Direct,
                                minValue: 0,
                                maxValue: 1,
                            },
                            {
                                name: 'RetentPLake',
                                label: 'P Wetland / Water Retention Fraction (0-1)',
                                calculator: calcs.Direct,
                                minValue: 0,
                                maxValue: 1,
                            },
                            {
                                name: 'RetentSedLake',
                                label: 'TSS Wetland / Water Retention Fraction (0-1)',
                                calculator: calcs.Direct,
                                minValue: 0,
                                maxValue: 1,
                            },
                        ]),
                    },
                ]),
            },
        ]),
        windowModel = new models.EntryWindowModel({
            dataModel: dataModel,
            title: title,
            tabs: tabs,
        });

    new EntryModal({
        model: windowModel,
        addModification: addModification,
    }).render();
}

function showLandCoverModal(dataModel, modifications, addModification) {
    var fields = models.makeFieldCollection('landcover', dataModel, modifications, [
            {
                name: 'Area__0',
                label: 'Hay / Pasture (ha)',
                calculator: calcs.ArrayIndex,
                decimalPlaces: 1,
                minValue: 0
            },
            {
                name: 'Area__1',
                label: 'Cropland (ha)',
                calculator: calcs.ArrayIndex,
                decimalPlaces: 1,
                minValue: 0
            },
            {
                name: 'Area__2',
                label: 'Wooded Areas (ha)',
                calculator: calcs.ArrayIndex,
                decimalPlaces: 1,
                minValue: 0
            },
            {
                name: 'Area__3',
                label: 'Wetlands (ha)',
                calculator: calcs.ArrayIndex,
                decimalPlaces: 1,
                minValue: 0
            },
            {
                name: 'Area__6',
                label: 'Open Land (ha)',
                calculator: calcs.ArrayIndex,
                decimalPlaces: 1,
                minValue: 0
            },
            {
                name: 'Area__7',
                label: 'Barren Areas (ha)',
                calculator: calcs.ArrayIndex,
                decimalPlaces: 1,
                minValue: 0
            },
            {
                name: 'Area__10',
                label: 'Low-Density Mixed (ha)',
                calculator: calcs.ArrayIndex,
                decimalPlaces: 1,
                minValue: 0
            },
            {
                name: 'Area__11',
                label: 'Medium-Density Mixed (ha)',
                calculator: calcs.ArrayIndex,
                decimalPlaces: 1,
                minValue: 0
            },
            {
                name: 'Area__12',
                label: 'High-Density Mixed (ha)',
                calculator: calcs.ArrayIndex,
                decimalPlaces: 1,
                minValue: 0
            },
            {
                name: 'Area__13',
                label: 'Low-Density Open Space (ha)',
                calculator: calcs.ArrayIndex,
                decimalPlaces: 1,
                minValue: 0
            },
        ]),
        windowModel = new models.LandCoverWindowModel({
            dataModel: dataModel,
            title: 'Land Cover',
            fields: fields,
        });

    new LandCoverModal({
        model: windowModel,
        addModification: addModification,
    }).render();
}

module.exports = {
    EntryModal: EntryModal,
    showLandCoverModal: showLandCoverModal,
    showSettingsModal: showSettingsModal,
};