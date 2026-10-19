import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ActivityRing,
  type ActivityRingItem,
  type ActivityRingProps,
  type AreaChartDataPoint,
  type BarChartItem,
  type ChartPoint,
  HorizontalBarChart,
  type HorizontalBarChartProps,
  MultiActivityRings,
  type MultiActivityRingsProps,
  RevenueTrendAreaChart,
  type RevenueTrendAreaChartProps,
  buildClosedAreaPath,
  buildSmoothBezierPath,
  calculateActivityRing,
  normalizeDataPoints,
} from "../src/components/SimpleCharts.js";

describe("Pure SVG Analytics Charts (SimpleCharts.tsx)", () => {
  describe("Mathematical Utilities & Path Calculations", () => {
    it("calculateActivityRing correctly computes circumference and clamped offsets", () => {
      const radius = 50;
      const expectedCircumference = 2 * Math.PI * radius;

      // 0%
      const zero = calculateActivityRing(0, 100, radius);
      assert.equal(zero.percentage, 0);
      assert.equal(Math.round(zero.circumference), Math.round(expectedCircumference));
      assert.equal(Math.round(zero.offset), Math.round(expectedCircumference));

      // 50%
      const half = calculateActivityRing(50, 100, radius);
      assert.equal(half.percentage, 50);
      assert.equal(Math.round(half.offset), Math.round(expectedCircumference * 0.5));

      // 100%
      const full = calculateActivityRing(100, 100, radius);
      assert.equal(full.percentage, 100);
      assert.equal(Math.round(full.offset), 0);

      // Clamped over 100%
      const overflow = calculateActivityRing(150, 100, radius);
      assert.equal(overflow.percentage, 100);
      assert.equal(Math.round(overflow.offset), 0);

      // Safe max with zero or negative max
      const safe = calculateActivityRing(10, 0, radius);
      assert.equal(safe.percentage, 100);
    });

    it("normalizeDataPoints handles edge cases and scales data properly", () => {
      // Empty input
      assert.deepEqual(normalizeDataPoints([], 400, 200), []);

      // Single item
      const singleData: AreaChartDataPoint[] = [{ label: "Mon", value: 100 }];
      const singleNormalized = normalizeDataPoints(singleData, 400, 200);
      assert.equal(singleNormalized.length, 1);
      assert.equal(typeof singleNormalized[0]?.x, "number");
      assert.equal(typeof singleNormalized[0]?.y, "number");

      // Multiple items
      const multiData: AreaChartDataPoint[] = [
        { label: "Day 1", value: 100 },
        { label: "Day 2", value: 200 },
        { label: "Day 3", value: 150 },
      ];
      const normalized = normalizeDataPoints(multiData, 300, 150, {
        top: 10,
        bottom: 20,
        left: 10,
        right: 10,
      });

      assert.equal(normalized.length, 3);
      // Day 1 has lowest value (100) -> highest y (bottom)
      // Day 2 has highest value (200) -> lowest y (top)
      const day1 = normalized[0] as ChartPoint;
      const day2 = normalized[1] as ChartPoint;
      assert.ok(day1.y > day2.y, "Lower value should have higher SVG y coordinate");
    });

    it("buildSmoothBezierPath produces correct SVG path syntax", () => {
      // Empty
      assert.equal(buildSmoothBezierPath([]), "");

      // Single point
      assert.equal(buildSmoothBezierPath([{ x: 10, y: 20 }]), "M 10 20");

      // Two points (straight line)
      assert.equal(
        buildSmoothBezierPath([
          { x: 10, y: 20 },
          { x: 30, y: 40 },
        ]),
        "M 10 20 L 30 40",
      );

      // Three or more points (cubic Bezier curve)
      const curve = buildSmoothBezierPath([
        { x: 10, y: 100 },
        { x: 50, y: 20 },
        { x: 90, y: 80 },
        { x: 130, y: 10 },
      ]);
      assert.ok(curve.startsWith("M 10 100 C "));
      assert.ok(curve.includes(", "));
    });

    it("buildClosedAreaPath forms a closed polygon under the Bezier line", () => {
      const points: ChartPoint[] = [
        { x: 10, y: 50 },
        { x: 100, y: 20 },
      ];
      const line = "M 10 50 L 100 20";
      const area = buildClosedAreaPath(line, points, 120);

      assert.equal(area, "M 10 50 L 100 20 L 100.00 120.00 L 10.00 120.00 Z");

      // Empty handling
      assert.equal(buildClosedAreaPath("", [], 120), "");
    });
  });

  describe("ActivityRing Component Rendering", () => {
    it("renders single occupancy activity ring with correct values and SVG markup", () => {
      const html = renderToStaticMarkup(
        React.createElement(ActivityRing, {
          value: 78,
          max: 100,
          label: "Occupancy Rate",
          sublabel: "24/31 Rooms",
        }),
      );

      assert.ok(html.includes("<svg"), "Should render SVG element");
      assert.ok(html.includes("Occupancy Rate: 78%"), "Should include aria/title text");
      assert.ok(html.includes("78%"), "Should render center percentage text");
      assert.ok(html.includes("24/31 Rooms"), "Should render sublabel text");
      assert.ok(html.includes("linearGradient"), "Should define gradient for stroke");
    });
  });

  describe("MultiActivityRings Component Rendering", () => {
    it("renders concentric Apple-style operational rings with legend", () => {
      const sampleRings: ActivityRingItem[] = [
        {
          label: "Occupancy",
          value: 85,
          max: 100,
          colorFrom: "#007aff",
          colorTo: "#34c759",
        },
        {
          label: "F&B Covers",
          value: 60,
          max: 100,
          colorFrom: "#ff9500",
          colorTo: "#ff3b30",
        },
        {
          label: "Clean Rooms",
          value: 95,
          max: 100,
          colorFrom: "#30b0c7",
          colorTo: "#5856d6",
        },
      ];

      const html = renderToStaticMarkup(
        React.createElement(MultiActivityRings, {
          rings: sampleRings,
          size: 160,
        }),
      );

      assert.ok(html.includes("Occupancy"), "Should render Occupancy label");
      assert.ok(html.includes("85%"), "Should render 85% in legend");
      assert.ok(
        html.includes("F&amp;B Covers") || html.includes("F&B Covers"),
        "Should render F&B label",
      );
      assert.ok(html.includes("Clean Rooms"), "Should render Clean Rooms label");
      assert.ok(html.includes("95%"), "Should render 95% in legend");
    });
  });

  describe("RevenueTrendAreaChart Component Rendering", () => {
    it("renders smooth Bezier area chart with grid lines and min/max labels", () => {
      const weeklyRevenue: AreaChartDataPoint[] = [
        { label: "Mon", value: 145000 },
        { label: "Tue", value: 180000 },
        { label: "Wed", value: 160000 },
        { label: "Thu", value: 210000 },
        { label: "Fri", value: 295000 },
        { label: "Sat", value: 380000 },
        { label: "Sun", value: 340000 },
      ];

      const html = renderToStaticMarkup(
        React.createElement(RevenueTrendAreaChart, {
          data: weeklyRevenue,
          formatValue: (v) => `LKR ${v.toLocaleString()}`,
          showGrid: true,
        }),
      );

      assert.ok(html.includes("<svg"), "Should render SVG");
      assert.ok(html.includes("path"), "Should render spline path");
      assert.ok(html.includes("Mon"), "Should render day labels");
      assert.ok(html.includes("Sun"), "Should render day labels");
      assert.ok(html.includes("Peak: LKR 380,000"), "Should format peak summary");
      assert.ok(html.includes("Min: LKR 145,000"), "Should format min summary");
    });
  });

  describe("HorizontalBarChart Component Rendering", () => {
    it("renders pure SVG horizontal bars with labels and gradient pills", () => {
      const topDishes: BarChartItem[] = [
        {
          id: "dish-1",
          label: "Jaffna Crab Curry",
          sublabel: "F&B Main",
          value: 48,
          formattedValue: "48 Orders (LKR 288,000)",
        },
        {
          id: "dish-2",
          label: "Ceylon Tea Infused Negroni",
          sublabel: "Bar",
          value: 36,
          formattedValue: "36 Servings",
        },
        {
          id: "dish-3",
          label: "Pol Roti with Lunu Miris",
          sublabel: "Breakfast",
          value: 29,
          formattedValue: "29 Orders",
        },
      ];

      const html = renderToStaticMarkup(
        React.createElement(HorizontalBarChart, {
          items: topDishes,
        }),
      );

      assert.ok(html.includes("Jaffna Crab Curry"), "Should include dish name");
      assert.ok(html.includes("48 Orders (LKR 288,000)"), "Should include formatted value");
      assert.ok(html.includes("Ceylon Tea Infused Negroni"), "Should include bar item");
      assert.ok(html.includes("<rect"), "Should render rect elements for bars");
    });
  });

  describe("Type Definitions & Verification", () => {
    it("ensures all exported interfaces and types are properly typed", () => {
      const samplePoint: ChartPoint = { x: 10, y: 20 };
      assert.equal(samplePoint.x, 10);

      const ringProps: ActivityRingProps = { value: 50 };
      assert.equal(ringProps.value, 50);

      const multiProps: MultiActivityRingsProps = { rings: [] };
      assert.equal(multiProps.rings.length, 0);

      const areaProps: RevenueTrendAreaChartProps = { data: [] };
      assert.equal(areaProps.data.length, 0);

      const barProps: HorizontalBarChartProps = { items: [] };
      assert.equal(barProps.items.length, 0);
    });
  });
});
