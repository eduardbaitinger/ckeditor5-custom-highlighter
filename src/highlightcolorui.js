import Plugin from '@ckeditor/ckeditor5-core/src/plugin';

import ButtonView from '@ckeditor/ckeditor5-ui/src/button/buttonview';
import SplitButtonView from '@ckeditor/ckeditor5-ui/src/dropdown/button/splitbuttonview';

import { createDropdown, addToolbarToDropdown} from '@ckeditor/ckeditor5-ui/src/dropdown/utils';

import highlightColorIcon from '../theme/icons/marker.svg';
import ColorIcon from '../theme/icons/color.svg';
import eraserIcon from '../theme/icons/eraser.svg';
import '../theme/highlightcolor.css';


export default class HighlightColorUI extends Plugin {

    get localizedOptionTitles() {
        const t = this.editor.t;

        return {

        };
    }

    /**
     * @inheritDoc
     */
    init() {
        const options = this.editor.config.get('highlightColor.options');

        for (const option of options) {
            this._addColorButton(option);
        }

        this._addDropdown(options);
    }

    _addColorButton(option) {
        const command = this.editor.commands.get('highlightColor');

        this._addButton('highlightColor:' + option.color, option.title, option.color, decorateColorButton);

        function decorateColorButton(button) {
            button.bind('isEnabled').to(command, 'isEnabled');
            button.bind('isOn').to(command, 'value', value => value === option.color);
            button.iconView.fillColor = option.color;
        }
    }

    _addButton(name, label, value, decorateButton = () => {}) {
        const editor = this.editor;

        editor.ui.componentFactory.add(name, locale => {
            const buttonView = new ButtonView(locale);

            const localized = this.localizedOptionTitles[label] ? this.localizedOptionTitles[label] : label;

            buttonView.set({
                label: localized,
                icon: (label !== 'White' ? ColorIcon : eraserIcon),
                tooltip: true
            });

            buttonView.on('execute', () => {
                editor.execute('highlightColor', {value});
                editor.editing.view.focus();
            });

            // Add additional behavior for buttonView.
            decorateButton(buttonView);

            return buttonView;
        });
    }

    _addDropdown(options) {
        const editor = this.editor;
        const t = editor.t;
        const componentFactory = editor.ui.componentFactory;

        const startingColor = options[0];

        const optionsMap = options.reduce((retVal, option) => {
            retVal[option.color] = option;

            return retVal;
        }, {});

        componentFactory.add('highlightColor', locale => {
            const command = editor.commands.get('highlightColor');
            const dropdownView = createDropdown(locale, SplitButtonView);
            const splitButtonView = dropdownView.buttonView;

            dropdownView.buttonView.set({
                label: t('Highlight Color'),
                icon: highlightColorIcon,
                tooltip: true
            });

            splitButtonView.set({
                tooltip: t('Highlight Color'),
                // Holds last executed highlight color.
                lastExecuted: startingColor.color,
                // Holds current highlight color to execute (might be different then last used).
                commandValue: startingColor.color
            });

            // Dropdown button changes to selection (command.value):
            // - If selection is in color it gets active color appearance (color) and is activated.
            splitButtonView.bind('color').to(command, 'value', value => getActiveOption(value, 'color'));
            splitButtonView.bind('commandValue').to(command, 'value', value => getActiveOption(value, 'color'));
            splitButtonView.bind('isOn').to(command, 'value', value => !!value);

            splitButtonView.delegate('execute').to(dropdownView);

            // Create buttons array.
            const buttons = options.map(option => {
                // Get existing color button.
                const buttonView = componentFactory.create('highlightColor:' + option.color);

                // Update lastExecutedColor on execute.
                this.listenTo(buttonView, 'execute', () => dropdownView.buttonView.set({lastExecuted: option.color}));

                return buttonView;
            });

            // Make toolbar button enabled when any button in dropdown is enabled before adding separator and eraser.
            dropdownView.bind('isEnabled').toMany(buttons, 'isEnabled', (...areEnabled) => areEnabled.some(isEnabled => isEnabled));

            dropdownView.extendTemplate( {
                attributes: {
                    class: [ 'highlight-color-picker' ]
                }
            } );

            addToolbarToDropdown(dropdownView, buttons);
            bindToolbarIconStyleToActiveColor(dropdownView);

            // Execute current action from dropdown's split button action button.
            splitButtonView.on('execute', () => {
                editor.execute('highlightColor', {value: splitButtonView.commandValue});
                editor.editing.view.focus();
            });

            // Returns active color option depending on current command value.
            // If current is not set or it is the same as last execute this method will return the option key (like icon or color)
            // of last executed color. Otherwise it will return option key for current one.
            function getActiveOption(current, key) {
                const whichColor = current === splitButtonView.lastExecuted ? splitButtonView.lastExecuted : current;

                if (!current) {
                    // if black (no styling) return empty color so our main button does not get styled
                    return 'rgba(0,0,0,0)';
                }

                return optionsMap[whichColor][key];
            }

            return dropdownView;
        });
    }
}

function bindToolbarIconStyleToActiveColor(dropdownView) {
    const actionView = dropdownView.buttonView.actionView;

    actionView.iconView.bind('fillColor').to(dropdownView.buttonView, 'color');
}