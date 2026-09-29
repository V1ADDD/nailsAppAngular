import { ChangeDetectionStrategy, Component, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { type Course } from '@app/core/data/models';
import { Icon } from '@app/shared/ui/icon/icon';

/** ТЗ 4.1 «Курсы»: list with add / remove (title, school, year). */
@Component({
  selector: 'app-courses-editor',
  imports: [FormsModule, Icon],
  template: `
    <fieldset class="courses">
      <legend class="field__label">Курсы и обучение</legend>
      @if (courses().length) {
        <ul class="courses__list">
          @for (course of courses(); track $index) {
            <li class="courses__item">
              <app-icon name="graduation-cap" [size]="18" />
              <span class="courses__text">
                <strong>{{ course.title }}</strong>
                <span>{{ course.school }} · {{ course.year }}</span>
              </span>
              <button
                type="button"
                class="btn btn--icon btn--ghost"
                [attr.aria-label]="'Удалить курс ' + course.title"
                (click)="remove($index)"
              >
                <app-icon name="trash" [size]="18" />
              </button>
            </li>
          }
        </ul>
      }
      <div class="courses__new">
        <input
          class="input"
          aria-label="Название курса"
          placeholder="Название курса"
          [(ngModel)]="title"
          name="courseTitle"
        />
        <input
          class="input"
          aria-label="Школа"
          placeholder="Школа"
          [(ngModel)]="school"
          name="courseSchool"
        />
        <input
          class="input"
          type="number"
          inputmode="numeric"
          aria-label="Год"
          placeholder="Год"
          min="1980"
          [max]="maxYear"
          [(ngModel)]="year"
          name="courseYear"
        />
        <button type="button" class="btn btn--outline" [disabled]="!canAdd()" (click)="add()">
          <app-icon name="plus" [size]="18" /> Добавить курс
        </button>
      </div>
    </fieldset>
  `,
  styles: `
    .courses {
      display: grid;
      gap: var(--space-2);
      min-width: 0;
      margin: 0;
      padding: 0;
      border: none;
    }
    .courses__list {
      display: grid;
      gap: var(--space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .courses__item {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-2) var(--space-3);
      color: var(--color-primary);
      background: var(--color-bg);
      border-radius: var(--radius-md);
    }
    .courses__text {
      display: grid;
      flex: 1;
      min-width: 0;
      font-size: var(--font-size-sm);
      color: var(--color-text);
      span {
        font-size: var(--font-size-xs);
        color: var(--color-text-muted);
      }
    }
    .courses__new {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-2);
      input:first-child {
        grid-column: 1 / -1;
      }
      .btn {
        grid-column: 1 / -1;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoursesEditor {
  readonly courses = model.required<readonly Course[]>();
  protected readonly maxYear = new Date().getFullYear();
  protected readonly title = signal('');
  protected readonly school = signal('');
  protected readonly year = signal<number | null>(null);

  protected canAdd(): boolean {
    const year = this.year();
    return !!this.title().trim() && !!year && year >= 1980 && year <= this.maxYear;
  }

  protected add(): void {
    if (!this.canAdd()) return;
    this.courses.update((list) => [
      ...list,
      { title: this.title().trim(), school: this.school().trim(), year: this.year()! },
    ]);
    this.title.set('');
    this.school.set('');
    this.year.set(null);
  }

  protected remove(index: number): void {
    this.courses.update((list) => list.filter((_, i) => i !== index));
  }
}
