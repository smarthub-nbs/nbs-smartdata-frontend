import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface FooterLink {
  label: string;
  route?: string;
}

interface FooterLinkGroup {
  title: string;
  links: FooterLink[];
}

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './footer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {
  protected readonly year = new Date().getFullYear();

  protected readonly linkGroups: FooterLinkGroup[] = [
    {
      title: 'Explore',
      links: [
        { label: 'Datasets', route: '/datasets' },
        { label: 'Explore data', route: '/explore' },
        { label: 'Search', route: '/search' },
      ],
    },
    {
      title: 'Build',
      links: [
        { label: 'Developer API', route: '/developers' },
        { label: 'My hub', route: '/account' },
      ],
    },
    {
      title: 'About',
      links: [{ label: 'About NBS' }, { label: 'Contact' }],
    },
  ];
}
