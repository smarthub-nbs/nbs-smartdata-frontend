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
          `<tr><td>${r.region}</td><td>${r.year}</td><td>${r.value}</td></tr>`,
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

    const rows = this.buildSampleRows(dataset)
      .map(
        (r) =>
          `<tr><td>${r.region}</td><td>${r.year}</td><td>${r.value}</td></tr>`,
      )
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${dataset.title} — NBS SmartData Hub</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 2rem; color: #111; }
            h1 { font-size: 1.25rem; }
            table { border-collapse: collapse; width: 100%; margin-top: 1rem; }
            th, td { border: 1px solid #ccc; padding: 0.5rem; text-align: left; }
            th { background: #f1f5f9; }
          </style>
        </head>
        <body>
          <h1>${dataset.title}</h1>
          <p>${dataset.description}</p>
          <p><strong>Publisher:</strong> ${dataset.publisher}</p>
          <p><strong>License:</strong> ${dataset.license}</p>
          <table>
            <thead><tr><th>Region</th><th>Year</th><th>Value</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <script>window.onload = () => { window.print(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
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
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
