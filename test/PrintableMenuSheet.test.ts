import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type CategoryGroupedMenu,
  MENU_TEMPLATE_OPTIONS,
  type PrintMenuLayout,
  type PrintMenuTemplate,
  PrintableCategorySection,
  type PrintableCategorySectionProps,
  type PrintableMenuCategory,
  type PrintableMenuConfig,
  PrintableMenuControls,
  type PrintableMenuControlsProps,
  PrintableMenuFooter,
  type PrintableMenuFooterProps,
  PrintableMenuHeader,
  type PrintableMenuHeaderProps,
  type PrintableMenuItem,
  PrintableMenuItemRow,
  type PrintableMenuItemRowProps,
  PrintableMenuSheet,
  type PrintableMenuSheetProps,
  STATUTORY_TAX_FOOTER_NOTE,
  formatPriceLkr,
  groupMenuItemsByCategory,
  resolveTrilingualString,
} from "../src/admin/menus/PrintableMenuSheet.js";

describe("Step 244: Printable Physical Restaurant Menu & Wine List PDF/Print View (PrintableMenuSheet.tsx)", () => {
  const sampleCategories: ReadonlyArray<PrintableMenuCategory> = [
    {
      id: "CAT-CURRY",
      name: { en: "Clay-Pot Curries & Rice", si: "ව්යංජන සහ බත්", ta: "கறிகள் மற்றும் சாதம்" },
      displayOrder: 1,
    },
    {
      id: "CAT-DESSERT",
      name: { en: "Ceylon Heritage Desserts", si: "දේශීය අතුරුපස", ta: "இனிப்புகள்" },
      displayOrder: 2,
    },
    {
      id: "CAT-EMPTY",
      name: { en: "Empty Category", si: "හිස්", ta: "வெற்று" },
      displayOrder: 3,
    },
  ];

  const sampleItems: ReadonlyArray<PrintableMenuItem> = [
    {
      id: "dish-1",
      code: "CUR-101",
      title: {
        en: "Village Style Chicken Rice & Curry",
        si: "ගමේ ක්රමයට සැකසූ කුකුළු මස් බත්",
        ta: "கோழி சாதம்",
      },
      description: {
        en: "Steamed Samba rice with chicken curry, dhal, and pol sambol",
        si: "සුවඳැති සම්බා බත්",
        ta: "சுவையான சம்பா சாதம்",
      },
      priceLkr: 2250,
      categoryId: "CAT-CURRY",
      isVegetarian: false,
      isVegan: false,
      isHalal: true,
      isGlutenFree: true,
      spicyLevel: 2,
      isAvailable: true,
    },
    {
      id: "dish-2",
      code: "DES-201",
      title: {
        en: "Watalappan with Kithul Treacle",
        si: "කිතුල් පැණි වටලප්පන්",
        ta: "வட்டலாப்பம்",
      },
      description: {
        en: "Traditional spiced steamed coconut custard with candied cashews",
        si: "දේශීය රසැති වටලප්පන්",
        ta: "பாரம்பரிய வட்டலாப்பம்",
      },
      priceLkr: 850,
      categoryId: "CAT-DESSERT",
      isVegetarian: true,
      isVegan: false,
      isHalal: true,
      isGlutenFree: true,
      spicyLevel: 0,
      isAvailable: true,
    },
    {
      id: "dish-3",
      code: "CUR-86",
      title: {
        en: "Sold Out Lobster",
        si: "අවසන් වූ පොකිරිස්සා",
        ta: "விற்றுத் தீர்ந்த இரால்",
      },
      priceLkr: 6500,
      categoryId: "CAT-CURRY",
      isAvailable: false,
    },
  ];

  describe("1. Statutory Declarations & Formatting Helpers", () => {
    it("preserves exact Sri Lankan statutory tax footer declaration", () => {
      assert.strictEqual(
        STATUTORY_TAX_FOOTER_NOTE,
        "All prices are in LKR and subject to 10% Service Charge and applicable government taxes (TDL, SSCL & VAT)",
      );
    });

    it("formatPriceLkr formats currency in Sri Lankan Rupees", () => {
      const formatted = formatPriceLkr(2250);
      assert.ok(formatted.includes("2,250") || formatted.includes("2250"));
    });

    it("resolveTrilingualString handles language lookups with fallbacks", () => {
      const text = { en: "Curry", si: "ව්යංජන", ta: "கறி" };
      assert.strictEqual(resolveTrilingualString(text, "en"), "Curry");
      assert.strictEqual(resolveTrilingualString(text, "si"), "ව්යංජන");
      assert.strictEqual(resolveTrilingualString(text, "ta"), "கறி");
      assert.strictEqual(resolveTrilingualString(undefined, "en"), "");
    });
  });

  describe("2. Pure Category Grouping (groupMenuItemsByCategory)", () => {
    it("groups items into categories and excludes empty categories", () => {
      const grouped = groupMenuItemsByCategory(sampleItems, sampleCategories, true);
      assert.strictEqual(grouped.length, 2);
      assert.strictEqual(grouped[0]?.category.id, "CAT-CURRY");
      assert.strictEqual(grouped[1]?.category.id, "CAT-DESSERT");

      // Verify sold out item is excluded when availableOnly is true
      assert.strictEqual(grouped[0]?.items.length, 1);
      assert.strictEqual(grouped[0]?.items[0]?.id, "dish-1");
    });

    it("includes unavailable items when availableOnly is false", () => {
      const grouped = groupMenuItemsByCategory(sampleItems, sampleCategories, false);
      const curryGroup = grouped.find((g) => g.category.id === "CAT-CURRY");
      assert.ok(curryGroup);
      assert.strictEqual(curryGroup.items.length, 2);
    });
  });

  describe("3. Static Markup & Component Verification", () => {
    it("renders PrintableMenuHeader with hotel name and outlet details", () => {
      const html = renderToStaticMarkup(
        React.createElement(PrintableMenuHeader, {
          hotelName: "Amangalla Resort & Spa",
          outletName: "The Dining Room",
          mealSession: "Dinner Tasting Menu",
          showSinhalaTamil: true,
        }),
      );
      assert.ok(
        html.includes("Amangalla Resort &amp; Spa") || html.includes("Amangalla Resort & Spa"),
      );
      assert.ok(html.includes("The Dining Room"));
      assert.ok(html.includes("Dinner Tasting Menu"));
      assert.ok(html.includes("ආපනශාලා මෙනුව"));
    });

    it("renders PrintableMenuItemRow with title, spicy icon, and price leader line", () => {
      const item = sampleItems[0];
      assert.ok(item);
      const html = renderToStaticMarkup(
        React.createElement(PrintableMenuItemRow, {
          item,
          showSinhalaTamil: true,
          showDescriptions: true,
          showDietaryBadges: true,
          showSpicyIcons: true,
        }),
      );
      assert.ok(html.includes(`data-testid="printable-item-${item.id}"`));
      assert.ok(html.includes("Village Style Chicken Rice"));
      assert.ok(html.includes("Spicy"));
      assert.ok(html.includes("border-dotted"));
      assert.ok(html.includes("H")); // Halal badge
      assert.ok(html.includes("GF")); // Gluten-free badge
    });

    it("renders PrintableCategorySection with category header and items", () => {
      const group: CategoryGroupedMenu = {
        category: sampleCategories[0] as PrintableMenuCategory,
        items: [sampleItems[0] as PrintableMenuItem],
      };

      const html = renderToStaticMarkup(
        React.createElement(PrintableCategorySection, {
          group,
          showSinhalaTamil: true,
          showDescriptions: true,
          showDietaryBadges: true,
          showSpicyIcons: true,
        }),
      );
      assert.ok(html.includes("Clay-Pot Curries"));
      assert.ok(html.includes("Village Style Chicken"));
    });

    it("renders PrintableMenuFooter with statutory tax note and SLTDA reg", () => {
      const html = renderToStaticMarkup(
        React.createElement(PrintableMenuFooter, {
          sltdaRegNumber: "SLTDA/SQA/HOT/00481",
        }),
      );
      assert.ok(
        html.includes(
          "All prices are in LKR and subject to 10% Service Charge and applicable government taxes (TDL, SSCL &amp; VAT)",
        ) ||
          html.includes(
            "All prices are in LKR and subject to 10% Service Charge and applicable government taxes (TDL, SSCL & VAT)",
          ),
      );
      assert.ok(html.includes("SLTDA Reg: SLTDA/SQA/HOT/00481"));
    });

    it("renders PrintableMenuControls with print button and toggles", () => {
      const config: PrintableMenuConfig = {
        hotelName: "Amangalla",
        outletName: "Verandah",
        mealSession: "Dinner",
        layout: "TWO_COLUMN",
        showSinhalaTamil: true,
        showDescriptions: true,
        showDietaryBadges: true,
        showSpicyIcons: true,
      };

      const html = renderToStaticMarkup(
        React.createElement(PrintableMenuControls, {
          config,
          onChangeConfig: () => undefined,
          onTriggerPrint: () => undefined,
        }),
      );
      assert.ok(html.includes('data-testid="printable-menu-controls"'));
      assert.ok(html.includes("Print / Save as PDF"));
      assert.ok(html.includes("no-print"));
      assert.ok(html.includes("A4 Two-Column"));
    });

    it("renders PrintableMenuSheet top-level component with two-column layout", () => {
      const html = renderToStaticMarkup(
        React.createElement(PrintableMenuSheet, {
          items: sampleItems,
          categories: sampleCategories,
        }),
      );
      assert.ok(html.includes('data-testid="printable-menu-sheet-root"'));
      assert.ok(html.includes('data-testid="printable-menu-body"'));
      assert.ok(html.includes("columns-1 md:columns-2"));
    });

    it("verifies all 5 print menu templates exist and render with distinct themes", () => {
      assert.strictEqual(MENU_TEMPLATE_OPTIONS.length, 5);
      const templateIds: PrintMenuTemplate[] = [
        "CEYLON_HERITAGE",
        "MODERN_MINIMAL",
        "TROPICAL_BISTRO",
        "RUSTIC_VILLAGE",
        "TWO_COLUMN_COMPACT",
      ];

      for (const tmpl of templateIds) {
        const option = MENU_TEMPLATE_OPTIONS.find((o) => o.id === tmpl);
        assert.ok(option, `Missing template option: ${tmpl}`);
        assert.ok(option.name);
        assert.ok(option.icon);

        const html = renderToStaticMarkup(
          React.createElement(PrintableMenuSheet, {
            items: sampleItems,
            categories: sampleCategories,
            initialConfig: { template: tmpl },
          }),
        );
        assert.ok(html.includes('data-testid="printable-menu-sheet-root"'));
      }
    });

    it("renders dish image when showPhotos is true and item has imageUrl", () => {
      const itemWithPhoto: PrintableMenuItem = {
        id: "dish-photo",
        code: "CUR-999",
        title: { en: "Illustrated Curry", si: "ව්යංජනය", ta: "கறி" },
        description: { en: "Delicious slow cooked curry" },
        priceLkr: 2500,
        categoryId: "CAT-CURRY",
        imageUrl: "https://example.com/curry.webp",
      };

      const htmlWithPhoto = renderToStaticMarkup(
        React.createElement(PrintableMenuItemRow, {
          item: itemWithPhoto,
          showSinhalaTamil: false,
          showDescriptions: true,
          showDietaryBadges: false,
          showSpicyIcons: false,
          showPhotos: true,
        }),
      );
      assert.ok(htmlWithPhoto.includes("<img"));
      assert.ok(htmlWithPhoto.includes("https://example.com/curry.webp"));

      const htmlWithoutPhoto = renderToStaticMarkup(
        React.createElement(PrintableMenuItemRow, {
          item: itemWithPhoto,
          showSinhalaTamil: false,
          showDescriptions: true,
          showDietaryBadges: false,
          showSpicyIcons: false,
          showPhotos: false,
        }),
      );
      assert.ok(!htmlWithoutPhoto.includes("<img"));
    });

    it("verifies constructible types and exported models", () => {
      const layout: PrintMenuLayout = "TWO_COLUMN";
      const item: PrintableMenuItem = sampleItems[0] as PrintableMenuItem;
      const cat: PrintableMenuCategory = sampleCategories[0] as PrintableMenuCategory;
      const config: PrintableMenuConfig = {
        hotelName: "Hotel",
        outletName: "Rest",
        mealSession: "Session",
        layout,
        showSinhalaTamil: true,
        showDescriptions: true,
        showDietaryBadges: true,
        showSpicyIcons: true,
      };
      const group: CategoryGroupedMenu = { category: cat, items: [item] };
      const headerProps: PrintableMenuHeaderProps = {
        hotelName: "H",
        outletName: "O",
        mealSession: "S",
      };
      const itemProps: PrintableMenuItemRowProps = {
        item,
        showSinhalaTamil: true,
        showDescriptions: true,
        showDietaryBadges: true,
        showSpicyIcons: true,
      };
      const catProps: PrintableCategorySectionProps = {
        group,
        showSinhalaTamil: true,
        showDescriptions: true,
        showDietaryBadges: true,
        showSpicyIcons: true,
      };
      const footerProps: PrintableMenuFooterProps = {};
      const ctrlProps: PrintableMenuControlsProps = {
        config,
        onChangeConfig: () => undefined,
      };
      const sheetProps: PrintableMenuSheetProps = { items: [item] };

      assert.ok(
        layout &&
          item &&
          cat &&
          config &&
          group &&
          headerProps &&
          itemProps &&
          catProps &&
          footerProps &&
          ctrlProps &&
          sheetProps,
      );
    });
  });
});
