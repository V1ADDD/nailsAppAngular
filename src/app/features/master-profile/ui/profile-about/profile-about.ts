import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { type Course } from '@app/core/data/models';
import { ProfileSection } from '../profile-section/profile-section';

/** «О себе» and «Обучение и курсы»; each block hides itself when empty. */
@Component({
  selector: 'app-profile-about',
  imports: [ProfileSection],
  template: `
    @if (about().trim()) {
      <app-profile-section heading="О себе" icon="user">
        <p class="about">{{ about() }}</p>
      </app-profile-section>
    }
    @if (courses().length) {
      <app-profile-section heading="Обучение и курсы" icon="graduation-cap">
        <ul class="courses" role="list">
          @for (course of courses(); track course.title + course.year) {
            <li class="course">
              <span class="course__year">{{ course.year }}</span>
              <div class="course__body">
                <span class="course__title">{{ course.title }}</span>
                <span class="course__school">{{ course.school }}</span>
              </div>
            </li>
          }
        </ul>
      </app-profile-section>
    }
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--space-4);
    }
    :host:empty {
      display: none;
    }
    .about {
      color: var(--color-text-secondary);
      white-space: pre-line;
    }
    .courses {
      display: grid;
      gap: var(--space-3);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .course {
      display: flex;
      gap: var(--space-3);
      align-items: flex-start;
    }
    .course__year {
      flex-shrink: 0;
      padding: var(--space-0-5) var(--space-2);
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-bold);
      color: var(--color-primary);
      background: var(--color-primary-soft);
      border-radius: var(--radius-full);
    }
    .course__body {
      display: grid;
      gap: var(--space-0-5);
      min-width: 0;
    }
    .course__title {
      font-weight: var(--font-weight-semibold);
    }
    .course__school {
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileAbout {
  readonly about = input('');
  readonly courses = input<readonly Course[]>([]);
}
