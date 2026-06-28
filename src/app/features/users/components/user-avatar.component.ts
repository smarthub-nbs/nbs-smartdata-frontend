import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import {
  avatarColorClass,
  userInitials,
} from '@app/features/users/utils/user-display.util';

type AvatarSize = 'sm' | 'md' | 'lg';

const SIZE_CLASSES: Record<AvatarSize, string> = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-12 text-base',
};

@Component({
  selector: 'app-user-avatar',
  standalone: true,
  templateUrl: './user-avatar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserAvatarComponent {
  readonly name = input('');
  readonly seed = input('');
  readonly size = input<AvatarSize>('md');
  readonly muted = input(false);

  protected readonly initials = computed(() => userInitials(this.name()));

  protected readonly classes = computed(() => {
    const color = this.muted()
      ? 'bg-slate-200 text-slate-500'
      : avatarColorClass(this.seed() || this.name());
    return `inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${SIZE_CLASSES[this.size()]} ${color}`;
  });
}
