import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type DialogContentProps,
  type DialogDescriptionProps,
  type DialogFooterProps,
  type DialogHeaderProps,
  DialogModal,
  DialogModalContent,
  DialogModalDescription,
  DialogModalFooter,
  DialogModalHeader,
  type DialogModalProps,
  DialogModalTitle,
  type DialogSize,
  type DialogTitleProps,
  type DialogVariant,
  getDialogSizeClasses,
  getDialogVariantClasses,
  syncDialogState,
} from "../src/components/DialogModal.js";

describe("Apple HIG Sheet & Center <dialog> Modal (DialogModal.tsx)", () => {
  describe("Size Classes (getDialogSizeClasses)", () => {
    it("returns correct max-width tokens for modal sizes", () => {
      assert.strictEqual(getDialogSizeClasses("sm"), "max-w-sm");
      assert.strictEqual(getDialogSizeClasses("md"), "max-w-lg");
      assert.strictEqual(getDialogSizeClasses("lg"), "max-w-2xl");
      assert.strictEqual(getDialogSizeClasses("xl"), "max-w-4xl");
      assert.strictEqual(getDialogSizeClasses("full"), "max-w-[95vw]");
      assert.strictEqual(getDialogSizeClasses(undefined), "max-w-lg");
    });
  });

  describe("Variant Classes (getDialogVariantClasses)", () => {
    it("returns correct responsive, bottomSheet, and centerModal layout classes", () => {
      const bottomSheet = getDialogVariantClasses("bottomSheet");
      assert.ok(bottomSheet.includes("rounded-t-[28px]"));
      assert.ok(bottomSheet.includes("bottom-0"));

      const centerModal = getDialogVariantClasses("centerModal");
      assert.ok(centerModal.includes("rounded-2xl"));
      assert.ok(centerModal.includes("inset-0"));

      const responsive = getDialogVariantClasses("responsive");
      assert.ok(responsive.includes("rounded-t-[28px]"));
      assert.ok(responsive.includes("md:rounded-2xl"));

      const fallback = getDialogVariantClasses(undefined);
      assert.ok(fallback.includes("rounded-t-[28px]"));
    });
  });

  describe("State Synchronization (syncDialogState)", () => {
    it("handles null dialog element safely", () => {
      assert.doesNotThrow(() => syncDialogState(null, true));
      assert.doesNotThrow(() => syncDialogState(null, false));
    });

    it("invokes showModal and close on mock dialog element", () => {
      let shown = false;
      let closed = false;
      const mockDialog = {
        open: false,
        showModal: () => {
          shown = true;
          mockDialog.open = true;
        },
        close: () => {
          closed = true;
          mockDialog.open = false;
        },
      } as unknown as HTMLDialogElement;

      syncDialogState(mockDialog, true);
      assert.ok(shown);
      assert.ok(mockDialog.open);

      syncDialogState(mockDialog, false);
      assert.ok(closed);
      assert.ok(!mockDialog.open);
    });
  });

  describe("Static HTML Markup Rendering", () => {
    it("returns empty string when isOpen is false", () => {
      const markup = renderToStaticMarkup(
        React.createElement(
          DialogModal,
          {
            isOpen: false,
            onClose: () => undefined,
          },
          React.createElement("p", null, "Hidden Modal"),
        ),
      );
      assert.strictEqual(markup, "");
    });

    it("renders open dialog with title, description, grabber, and children", () => {
      const markup = renderToStaticMarkup(
        React.createElement(
          DialogModal,
          {
            isOpen: true,
            onClose: () => undefined,
            title: "Guest Quick Check-In",
            description: "Room 402 • Ocean Villa",
            variant: "responsive",
            size: "lg",
            footer: React.createElement("button", { type: "button" }, "Confirm Check-In"),
          },
          React.createElement("div", { className: "content" }, "Guest Form"),
        ),
      );

      assert.ok(markup.startsWith("<dialog"));
      assert.ok(markup.includes('aria-modal="true"'));
      assert.ok(markup.includes("apple-material-thick"));
      assert.ok(markup.includes("Guest Quick Check-In"));
      assert.ok(markup.includes("Room 402 • Ocean Villa"));
      assert.ok(markup.includes("Guest Form"));
      assert.ok(markup.includes("Confirm Check-In"));
      assert.ok(markup.includes('aria-label="Close dialog"'));
      assert.ok(markup.includes("rounded-full bg-slate-300"));
    });

    it("renders centerModal variant without grabber handle", () => {
      const markup = renderToStaticMarkup(
        React.createElement(
          DialogModal,
          {
            isOpen: true,
            onClose: () => undefined,
            variant: "centerModal",
            showGrabber: false,
          },
          React.createElement("p", null, "Desktop Center Modal"),
        ),
      );

      assert.ok(markup.includes("<dialog"));
      assert.ok(!markup.includes("rounded-full bg-slate-300"));
      assert.ok(markup.includes("Desktop Center Modal"));
    });

    it("renders standalone subcomponents independently", () => {
      const headerMarkup = renderToStaticMarkup(
        React.createElement(
          DialogModalHeader,
          null,
          React.createElement(DialogModalTitle, { as: "h3" }, "Sub Header"),
          React.createElement(DialogModalDescription, null, "Sub Desc"),
        ),
      );
      assert.ok(headerMarkup.includes("Sub Header"));
      assert.ok(headerMarkup.includes("Sub Desc"));

      const contentMarkup = renderToStaticMarkup(
        React.createElement(DialogModalContent, null, "Modal Body"),
      );
      assert.ok(contentMarkup.includes("Modal Body"));

      const footerMarkup = renderToStaticMarkup(
        React.createElement(
          DialogModalFooter,
          null,
          React.createElement("button", { type: "button" }, "Save"),
        ),
      );
      assert.ok(footerMarkup.includes("Save"));
    });
  });

  describe("Type Definitions & Verification", () => {
    it("validates all exported dialog interfaces and types are constructible", () => {
      const _variant: DialogVariant = "responsive";
      const _size: DialogSize = "xl";
      const _props: DialogModalProps = {
        isOpen: true,
        onClose: () => undefined,
        variant: _variant,
        size: _size,
        closeOnEsc: true,
        closeOnScrimClick: true,
        showCloseButton: true,
        showGrabber: true,
        ariaLabel: "Modal",
        className: "custom-modal",
      };

      const _headerProps: DialogHeaderProps = {};
      const _titleProps: DialogTitleProps = { as: "h2" };
      const _descProps: DialogDescriptionProps = {};
      const _contentProps: DialogContentProps = {};
      const _footerProps: DialogFooterProps = {};

      assert.strictEqual(_props.size, "xl");
      assert.strictEqual(_props.variant, "responsive");
      assert.strictEqual(_titleProps.as, "h2");
      assert.ok(_headerProps !== undefined);
      assert.ok(_descProps !== undefined);
      assert.ok(_contentProps !== undefined);
      assert.ok(_footerProps !== undefined);
    });
  });
});
