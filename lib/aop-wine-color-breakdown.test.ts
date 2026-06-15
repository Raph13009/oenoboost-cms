import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  hasWineColorBreakdownData,
  validateWineColorBreakdown,
  wineColorBreakdownTotal,
} from "./aop-wine-color-breakdown";

describe("validateWineColorBreakdown", () => {
  it("accepts all-null breakdown", () => {
    assert.equal(
      validateWineColorBreakdown({
        wine_pct_red: null,
        wine_pct_rose: null,
        wine_pct_white: null,
        wine_pct_sparkling: null,
        wine_pct_liqueur: null,
      }),
      null,
    );
  });

  it("accepts five shares summing to 100", () => {
    assert.equal(
      validateWineColorBreakdown({
        wine_pct_red: 60,
        wine_pct_rose: 10,
        wine_pct_white: 25,
        wine_pct_sparkling: 5,
        wine_pct_liqueur: 0,
      }),
      null,
    );
  });

  it("rejects partial data with missing rosé", () => {
    assert.match(
      validateWineColorBreakdown({
        wine_pct_red: 70,
        wine_pct_rose: null,
        wine_pct_white: 30,
        wine_pct_sparkling: 0,
        wine_pct_liqueur: 0,
      }) ?? "",
      /cinq pourcentages/,
    );
  });

  it("rejects totals that are not 100", () => {
    assert.match(
      validateWineColorBreakdown({
        wine_pct_red: 20,
        wine_pct_rose: 20,
        wine_pct_white: 20,
        wine_pct_sparkling: 20,
        wine_pct_liqueur: 19,
      }) ?? "",
      /100 %/,
    );
  });
});

describe("wineColorBreakdownTotal", () => {
  it("includes rosé in the total", () => {
    assert.equal(
      wineColorBreakdownTotal({
        wine_pct_red: 40,
        wine_pct_rose: 10,
        wine_pct_white: 30,
        wine_pct_sparkling: 15,
        wine_pct_liqueur: 5,
      }),
      100,
    );
  });
});

describe("hasWineColorBreakdownData", () => {
  it("detects rosé-only data", () => {
    assert.equal(
      hasWineColorBreakdownData({
        wine_pct_red: null,
        wine_pct_rose: 100,
        wine_pct_white: null,
        wine_pct_sparkling: null,
        wine_pct_liqueur: null,
      }),
      true,
    );
  });
});
