import { Observable } from 'rxjs';
import {
  Dataset,
  DatasetFilters,
  DatasetMetadataUpdate,
  DatasetTopic,
} from '@app/features/discovery/models/dataset.model';

export interface DatasetAdapter {
  list(filters?: DatasetFilters): Observable<Dataset[]>;
  getById(id: string): Observable<Dataset>;
  listTopics(): Observable<DatasetTopic[]>;
  updateMetadata(
    id: string,
    metadata: DatasetMetadataUpdate,
  ): Observable<Dataset>;
}
