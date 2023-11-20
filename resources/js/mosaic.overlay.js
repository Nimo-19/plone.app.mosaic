// This plugin is used to display an overlay
import $ from "jquery";
import Modal from "@plone/mockup/src/pat/modal/modal";

export default class Overlay {
    original_content = null;

    constructor(options, panels) {
        this.options = options;
        this.panels = panels;
        if(!this.original_content) {
            this.original_content = document.querySelector(".mosaic-original-content");
            this.$el = $(this.original_content);
        }
    }

    properties_edit_url() {
        const edit_url = window.location.href.split("?");
        return `${edit_url[0]}?ajax_load=${new Date().getTime()}${
            edit_url.length > 1 ? "&" + edit_url[1] : ""
        }`;
    }

    before_modal_render() {
        // remove the original form inside ".mosaic-original-content #content-core"
        // to fix doubled IDs in DOM which leads to UI problems inside the
        // modal form
        this.$el.find("#content-core > form").remove();
        this.$el.removeClass("properties-reloaded");
    }

    prepare_properties_form() {
        // we have to disable "pat-layout" inside the modal form
        this.modal.$modalContent.find("#fieldset-layout").addClass("disable-patterns");
    }

    load_properties_form() {
        // Load the original form again
        const self = this;
        if(self.$el.hasClass("properties-reloaded")) {
            return;
        }
        self.$el.find("#content-core").load(
            self.properties_edit_url() + " #content-core > form",
        );
        self.$el.addClass("properties-reloaded");

    }

    initialize() {
        const self = this;
        self.modal = new Modal(".mosaic-original-content", {
            ajaxUrl: self.properties_edit_url(),
            content: "#content-core",
            modalSizeClass: "modal-xl",
            position: "center top",
            actionOptions: {
                isForm: true,
                displayInModal: false,
                reloadWindowOnClose: false,
            },
        });

        self.prepare_autotoc_listener();
        // override modal initialization
        self.modal.on("before-render", (e) => {
            self.before_modal_render();
        });
        self.modal.on("rendered", (e) => {
            self.prepare_properties_form();
        });
        self.modal.on("hide", (e) => {
            self.load_properties_form();
        })
        self.modal.init();
    }

    override_form_keylistener() {

        // Override https://github.com/plone/mockup/blob/d3de042d1af04f8b01337744a2f30f1da409a149/src/pat/modal/modal.js#L442

        $("form", self.modal).off("keydown")

        $("form", self.modal).on("keydown", function (event) {
            // ignore keys which are not enter, and ignore enter outside form
            // elements.
            if (event.code !== 13 || ! ['INPUT','SELECT','BUTTON (?!) '].includes(event.target.nodeName)) {
                return;
            }
            event.preventDefault();
            $("input[type=submit], button[type=submit], button:not(type)", this)
                .eq(0)
                .trigger("click");
        });
    }

    prepare_autotoc_listener() {
        const self = this;

        function handler() {
            $(document).off("keydown", `.${self.modal.options.templateOptions.classDialog}`)
            self.modal.activateFocusTrap()
        }

        function prepareListener() {
            const tabLinks = self.modal.$modalContent.find('.autotoc-nav a').toArray()
            tabLinks.forEach(element => {
                element.addEventListener('click', handler)
            });
            self.override_form_keylistener()
        }

        function removeListeners() {
            const tabLinks = self.modal.$modalContent.find('.autotoc-nav a').toArray()
            tabLinks.forEach((e) => e.removeEventListener('click', handler))
        }

        self.modal.on('shown', prepareListener)
        self.modal.on("hide", removeListeners)
    }

    open(mode, tile_config) {
        // setup visibility of fields before showing modal
        this.modal.on("after-render", (e) => {
            this.setup_visibility(mode, tile_config);
        });
        // show modal
        this.modal.show();
    }

    setup_visibility(mode, tile_config) {
        var self = this;
        var modalContent = self.modal.$modalContent;

        if (mode === "all" && self.options.overlay_hide_fields) {
            // Hide layout field
            modalContent
                .find(self.options.customContentLayout_selector)
                .addClass("mosaic-hidden");
            modalContent
                .find(self.options.contentLayout_selector)
                .addClass("mosaic-hidden");

            // Hide field which are on the wysiwyg area
            for (const tg of self.options.tiles) {
                if (tg.name === "fields") {
                    for (const field_tile of tg.tiles) {
                        if (
                            self.panels.find(`.mosaic-${field_tile.name}-tile`)
                                .length === 0
                        ) {
                            continue;
                        }
                        $(`#${field_tile.id}`, modalContent).addClass("mosaic-hidden");
                    }
                }
            }

            // hide fieldsets which only has hidden fields
            for (fieldset of modalContent.find("fieldset")) {
                if (
                    fieldset.querySelectorAll(".field:not(.mosaic-hidden)").length === 0
                ) {
                    fieldset.classList.remove("active");
                }
            }
        } else if (mode === "field") {
            // Get fieldset and field
            var field = $("#" + tile_config.id, modalContent);
            var fieldset = field.parents("fieldset");

            // Hide all fieldsets
            modalContent
                .find("fieldset")
                .removeClass("active")
                .addClass("mosaic-hidden");
            modalContent.find("form").removeClass("pat-autotoc");

            // Show current fieldset
            fieldset.addClass("active").removeClass("mosaic-hidden");

            // Hide all fields in current fieldset
            fieldset.children().addClass("mosaic-hidden");

            // Show current field
            field.removeClass("mosaic-hidden");

            // Hide form tabs
            modalContent.find("nav").addClass("mosaic-hidden");
        }
    }
}
