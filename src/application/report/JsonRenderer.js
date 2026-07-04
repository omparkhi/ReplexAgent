// @ts-nocheck
/**
 * Renders ReportData to structured JSON format.
 * Machine-readable output for programmatic consumption and API integration.
 */
export class JsonRenderer {
  /**
   * Render ReportData to JSON.
   * @param {import('./report.interface.js').ReportData} data
   * @returns {import('./report.interface.js').RenderedReport}
   */
  render(data) {
    const output = {
      report: {
        title: data.title,
        url: data.url,
        generatedAt: data.generatedAt,
        version: '1.0.0',
        agent: 'replexagent-report-agent'
      },
      confidence: data.overallConfidence,
      executive: {
        ...data.executive,
        confidence: data.executive.confidence
      },
      developer: {
        ...data.developer,
        confidence: data.developer.confidence
      },
      business: {
        ...data.business,
        confidence: data.business.confidence
      },
      roadmap: {
        ...data.roadmap,
        phases: data.roadmap.phases.map(p => ({
          ...p,
          confidence: p.confidence
        })),
        confidence: data.roadmap.confidence
      },
      metadata: data.metadata
    };

    const content = JSON.stringify(output, null, 2);
    const filename = this.#slugify(data.title) + '.json';

    return {
      format: 'json',
      content,
      filename,
      mimeType: 'application/json',
      sizeBytes: Buffer.byteLength(content, 'utf-8')
    };
  }

  #slugify(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
}
