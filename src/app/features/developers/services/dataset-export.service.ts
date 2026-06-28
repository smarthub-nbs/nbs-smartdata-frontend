import { Injectable } from '@angular/core';
import { Observable, delay, map, of } from 'rxjs';
import { Dataset } from '@app/features/discovery';
import { DatasetExportFormat } from '@app/features/developers/models/export-format.model';
import { downloadText } from '@app/features/developers/utils/file-download.util';

interface SampleRow {
  region: string;
  year: number;
  value: number;
}

@Injectable({ providedIn: 'root' })
export class DatasetExportService {
  export(dataset: Dataset, format: DatasetExportFormat): Observable<void> {
    return of(undefined).pipe(
      delay(400),
      map(() => {
        switch (format) {
          case 'csv':
            this.exportCsv(dataset);
            break;
          case 'json':
            this.exportJson(dataset);
            break;
          case 'xlsx':
            this.exportExcel(dataset);
            break;
          case 'sdmx':
            this.exportSdmx(dataset);
            break;
          case 'pdf':
            this.exportPdfReport(dataset);
            break;
        }
      }),
    );
  }

  private exportCsv(dataset: Dataset): void {
    const rows = this.buildSampleRows(dataset);
    const header = 'region,year,value';
    const body = rows.map((r) => `${r.region},${r.year},${r.value}`).join('\n');
    downloadText(
      `${header}\n${body}`,
      `${dataset.id}.csv`,
      'text/csv;charset=utf-8',
    );
  }

  private exportJson(dataset: Dataset): void {
    const payload = {
      dataset: {
        id: dataset.id,
        title: dataset.title,
        description: dataset.description,
        format: dataset.format,
        license: dataset.license,
        updatedAt: dataset.updatedAt,
      },
      sampleData: this.buildSampleRows(dataset),
    };
    downloadText(
      JSON.stringify(payload, null, 2),
      `${dataset.id}.json`,
      'application/json',
    );
  }

  private exportExcel(dataset: Dataset): void {
    const rows = this.buildSampleRows(dataset);
    const tableRows = rows
      .map(
        (r) =>
          `<tr><td>${this.escapeHtml(r.region)}</td><td>${r.year}</td><td>${r.value}</td></tr>`,
      )
      .join('');
    const html = `
      <html><head><meta charset="utf-8"></head><body>
      <table border="1">
        <tr><th>region</th><th>year</th><th>value</th></tr>
        ${tableRows}
      </table></body></html>`;
    downloadText(html, `${dataset.id}.xls`, 'application/vnd.ms-excel');
  }

  private exportSdmx(dataset: Dataset): void {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<mes:Structure xmlns:mes="http://www.sdmx.org/resources/sdmxml/schemas/v2_1/message">
  <mes:Header>
    <mes:ID>${dataset.id}</mes:ID>
    <mes:Test>false</mes:Test>
    <mes:Prepared>${new Date().toISOString()}</mes:Prepared>
    <mes:Sender id="NBS-TZ"/>
  </mes:Header>
  <mes:Structures>
    <mes:Dataflow id="${dataset.id}" agencyID="NBS">
      <mes:Name>${this.escapeXml(dataset.title)}</mes:Name>
      <mes:Description>${this.escapeXml(dataset.description)}</mes:Description>
    </mes:Dataflow>
  </mes:Structures>
</mes:Structure>`;
    downloadText(xml, `${dataset.id}.xml`, 'application/xml');
  }

  private exportPdfReport(dataset: Dataset): void {
    const printWindow = window.open('', '_blank', 'noopener,noreferrer');
    if (!printWindow) {
      throw new Error('Pop-up blocked. Allow pop-ups to print the PDF report.');
    }

    printWindow.opener = null;

    const doc = printWindow.document;
    doc.title = `${dataset.title} - NBS SmartData Hub`;

    const style = doc.createElement('style');
    style.textContent = [
      'body { font-family: system-ui, sans-serif; padding: 2rem; color: #111; }',
      'h1 { font-size: 1.25rem; }',
      'table { border-collapse: collapse; width: 100%; margin-top: 1rem; }',
      'th, td { border: 1px solid #ccc; padding: 0.5rem; text-align: left; }',
      'th { background: #f1f5f9; }',
    ].join('\n');
    doc.head.appendChild(style);

    const heading = doc.createElement('h1');
    heading.textContent = dataset.title;
    doc.body.appendChild(heading);

    const description = doc.createElement('p');
    description.textContent = dataset.description;
    doc.body.appendChild(description);

    doc.body.appendChild(
      this.buildPrintMeta(doc, 'Publisher', dataset.publisher),
    );
    doc.body.appendChild(this.buildPrintMeta(doc, 'License', dataset.license));
    doc.body.appendChild(
      this.buildPrintTable(doc, this.buildSampleRows(dataset)),
    );

    printWindow.setTimeout(() => printWindow.print(), 0);
  }

  private buildPrintMeta(
    doc: Document,
    label: string,
    value: string,
  ): HTMLParagraphElement {
    const paragraph = doc.createElement('p');
    const strong = doc.createElement('strong');
    strong.textContent = `${label}:`;
    paragraph.append(strong, ` ${value}`);
    return paragraph;
  }

  private buildPrintTable(doc: Document, rows: SampleRow[]): HTMLTableElement {
    const table = doc.createElement('table');
    const thead = doc.createElement('thead');
    const headerRow = doc.createElement('tr');
    for (const heading of ['Region', 'Year', 'Value']) {
      const th = doc.createElement('th');
      th.textContent = heading;
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);

    const tbody = doc.createElement('tbody');
    for (const row of rows) {
      const tr = doc.createElement('tr');
      for (const value of [row.region, row.year, row.value]) {
        const td = doc.createElement('td');
        td.textContent = String(value);
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }

    table.append(thead, tbody);
    return table;
  }

  private buildSampleRows(dataset: Dataset): SampleRow[] {
    const baseYear = 2020;
    const regions =
      dataset.region === 'National'
        ? ['Dodoma', 'Dar es Salaam', 'Mwanza', 'Arusha']
        : [dataset.region];

    return regions.flatMap((region, index) =>
      [0, 1, 2].map((offset) => ({
        region,
        year: baseYear + offset,
        value: Number((1000 + index * 120 + offset * 45.5).toFixed(1)),
      })),
    );
  }

  private escapeXml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }

  private escapeHtml(value: string): string {
    return this.escapeXml(value).replaceAll("'", '&#39;');
  }
}
