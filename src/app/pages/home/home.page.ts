import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { CardComponent } from '../../components/card/card.component';
import { ProgramItem, ProgramService } from '../../services/program.service';

@Component({
  selector: 'app-home',
  imports: [CommonModule, CardComponent],
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.css'],
})
export class HomeComponent implements OnInit {
  private programService = inject(ProgramService);

  loading = signal(true);
  error = signal<string | null>(null);
  programs = signal<ProgramItem[]>([]);

  ngOnInit(): void {
    this.programService.getProgramList().subscribe({
      next: (list) => {
        this.programs.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Không thể tải danh sách chương trình. Vui lòng thử lại.');
        this.loading.set(false);
      },
    });
  }
}
