// @ts-check

/**
 * ClickTracker — wraps a Playwright page to count every user interaction.
 * Tracks clicks, fills, key presses — anything a real user would do.
 * Generates a structured report at the end.
 */
class ClickTracker {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    /** @type {Array<{action: string, target: string, desc: string, timestamp: number}>} */
    this.steps = [];
    this.startTime = Date.now();
  }

  /**
   * @param {string} selector
   * @param {string} desc
   * @param {object} [options]
   */
  async click(selector, desc, options) {
    this.steps.push({
      action: 'click',
      target: selector,
      desc,
      timestamp: Date.now() - this.startTime,
    });
    await this.page.click(selector, options);
  }

  /**
   * @param {string} selector
   * @param {string} value
   * @param {string} desc
   */
  async fill(selector, value, desc) {
    this.steps.push({
      action: 'fill',
      target: selector,
      desc,
      timestamp: Date.now() - this.startTime,
    });
    await this.page.fill(selector, value);
  }

  /**
   * @param {string} selector
   * @param {string} key
   * @param {string} desc
   */
  async press(selector, key, desc) {
    this.steps.push({
      action: 'press',
      target: selector,
      desc,
      timestamp: Date.now() - this.startTime,
    });
    await this.page.press(selector, key);
  }

  get clickCount() {
    return this.steps.filter(s => s.action === 'click').length;
  }

  get totalInteractions() {
    return this.steps.length;
  }

  /**
   * @param {string} flowName
   * @returns {{flow: string, clicks: number, interactions: number, steps: Array}}
   */
  report(flowName) {
    return {
      flow: flowName,
      clicks: this.clickCount,
      interactions: this.totalInteractions,
      steps: this.steps.map(s => ({
        action: s.action,
        target: s.target,
        desc: s.desc,
      })),
    };
  }

  reset() {
    this.steps = [];
    this.startTime = Date.now();
  }
}

/** @type {Array<ReturnType<ClickTracker['report']>>} */
const allReports = [];

/**
 * @param {ReturnType<ClickTracker['report']>} report
 */
function collectReport(report) {
  allReports.push(report);
}

function getAllReports() {
  return allReports;
}

function clearReports() {
  allReports.length = 0;
}

module.exports = { ClickTracker, collectReport, getAllReports, clearReports };
