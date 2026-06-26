import { Observable } from 'rxjs';
import {
  Dataset,
  DatasetMetadataUpdate,
  DatasetTopic,
} from '@app/features/discovery/models/dataset.model';

export interface DatasetAdapter {
  list(): Observable<Dataset[]>;
  listTopics(): Observable<DatasetTopic[]>;
  updateMetadata(
    id: string,
    metadata: DatasetMetadataUpdate,
  ): Observable<Dataset>;
}
