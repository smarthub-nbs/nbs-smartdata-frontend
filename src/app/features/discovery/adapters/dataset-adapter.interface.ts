import { Observable } from 'rxjs';
import {
  Dataset,
  DatasetFilters,
  DatasetTopic,
} from '@app/features/discovery/models/dataset.model';

export interface DatasetAdapter {
  list(filters?: DatasetFilters): Observable<Dataset[]>;
  getById(id: string): Observable<Dataset>;
  listTopics(): Observable<DatasetTopic[]>;
}
