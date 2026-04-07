'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Downbar from '../../Components/Downbar';
import Navbar from '../../Components/Navbar';

type QuestionType = 'multiple_choice' | 'checkboxes' | 'short_text';

interface FormQuestion {
  id: string;
  type: QuestionType;
  questionText: string;
  options?: string[];
}

interface TruthPanelForm {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  questions: FormQuestion[];
}

type SortOption = 'latest' | 'oldest' | 'name';


export default function FormCreation() {
  const router = useRouter();
  const [forms, setForms] = useState<TruthPanelForm[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<TruthPanelForm | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>('latest');
  const [formsPerPage, setFormsPerPage] = useState(10);
  const [formPage, setFormPage] = useState(1);

  const sortedForms = useMemo(() => {
    const formsCopy = [...forms];

    if (sortOption === 'name') {
      return formsCopy.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }

    return formsCopy.sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime() || 0;
      const bTime = new Date(b.createdAt).getTime() || 0;
      return sortOption === 'latest' ? bTime - aTime : aTime - bTime;
    });
  }, [forms, sortOption]);

  const totalFormPages = Math.max(1, Math.ceil(sortedForms.length / formsPerPage));
  const formStartIndex = (formPage - 1) * formsPerPage;
  const paginatedForms = sortedForms.slice(formStartIndex, formStartIndex + formsPerPage);

  useEffect(() => {
    if (formPage > totalFormPages) {
      setFormPage(totalFormPages);
    }
  }, [formPage, totalFormPages]);

  useEffect(() => {
    setFormPage(1);
  }, [formsPerPage, sortOption]);

  const handleDelete = async (id: string) => {
    try {
        const { deleteSurveyAPI } = await import('../../../../utils/api');
        const res = await deleteSurveyAPI(id);
        if (res?.success) {
            setForms((prev) => prev.filter((f) => f.id !== id));
        } else {
            alert(res?.message || 'Failed to gracefully delete from database');
        }
    } catch (e) {
        console.error(e);
    } finally {
        setDeleteTarget(null);
    }
  };

  useEffect(() => {
    sessionStorage.removeItem('truth_panel_draft');
    // Fetch live surveys from Express API
    const loadForms = async () => {
      try {
        const { fetchAllSurveys } = await import('../../../../utils/api');
        const res = await fetchAllSurveys();
        if (res?.success) {
          setForms((res.data || []).map((s: any) => ({
            id: s.id,
            title: s.title,
            description: s.description || '',
            createdAt: s.created_at,
            questions: (s.Questions || []).map((q: any) => ({
              id: q.id,
              type: q.question_type === 'MCQ' ? 'multiple_choice' : q.question_type,
              questionText: q.question_text,
              options: q.options || [],
            })),
          })));
        }
      } catch (err) {
        console.error('Failed to load forms', err);
      }
    };
    loadForms();
  }, []);

  return (
    <main className="min-h-screen bg-[var(--OffWhite)] text-[var(--OffBlack)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[390px] flex-col pb-28">
        <Navbar />

        <section className="flex flex-1 flex-col px-5 pb-8 pt-2 mt-[10%] ">
          

          <div className="text-center">
            <h1 className="font-[var(--font-poppins)] text-4xl font-medium leading-tight text-[var(--OffBlack)]">
              Create a Form
            </h1>
            <p className="mt-3 max-w-[280px] font-[var(--font-inter)] text-sm font-light text-[var(--OffBlack)]/75 ml-auto mr-auto">
              Build your custom form step by step
            </p>

            <button
              type="button"
              onClick={() => router.push('/Frontend/AdminPanel/FormCreation/Builder')}
              className="mt-8 w-full rounded-2xl bg-[var(--PBlue)] px-6 py-4 font-[var(--font-poppins)] text-base font-medium text-white shadow-[0_12px_24px_rgba(28,105,174,0.28)]"
            >
              Get Started
            </button>
          </div>

          <div className="mt-6 flex-1 space-y-3 overflow-y-auto pb-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="font-[var(--font-poppins)] text-sm font-medium text-[var(--OffBlack)]/75">
                  Saved forms
                </p>

                <select
                  value={sortOption}
                  onChange={(event) => setSortOption(event.target.value as SortOption)}
                  className="h-8 rounded-lg border border-[color:var(--OffBlack)]/15 bg-white px-2 font-[var(--font-inter)] text-xs text-[var(--OffBlack)] outline-none"
                  aria-label="Sort saved forms"
                >
                  <option value="latest">Latest</option>
                  <option value="oldest">Oldest</option>
                  <option value="name">Name (A-Z)</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-[var(--font-inter)] text-[11px] font-medium uppercase tracking-wide text-[var(--OffBlack)]/65">
                  Show
                </span>
                <select
                  value={formsPerPage}
                  onChange={(event) => setFormsPerPage(Number(event.target.value))}
                  className="h-8 rounded-lg border border-[color:var(--OffBlack)]/15 bg-white px-2 font-[var(--font-inter)] text-xs text-[var(--OffBlack)] outline-none"
                  aria-label="Forms per page"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            {forms.length === 0 ? (
              <div className="rounded-xl bg-white p-4 text-center shadow-sm">
                <p className="font-[var(--font-inter)] text-sm text-[var(--OffBlack)]/70">No saved forms yet.</p>
              </div>
            ) : (
              <>
                {paginatedForms.map((form) => (
                  <article key={form.id} className="rounded-xl bg-white p-4 shadow-sm">
                    <p className="font-[var(--font-poppins)] text-base font-medium">{form.title || 'Untitled Form'}</p>
                    <p className="mt-1 font-[var(--font-inter)] text-xs text-[var(--OffBlack)]/65">
                      {form.questions.length} questions
                    </p>
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(form)}
                        className="rounded-lg border border-red-400 px-3 py-1.5 font-[var(--font-poppins)] text-xs text-red-500"
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}

                {sortedForms.length > formsPerPage ? (
                  <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setFormPage((prev) => Math.max(1, prev - 1))}
                      disabled={formPage === 1}
                      className="rounded-md border border-[var(--OffBlack)]/12 px-3 py-1.5 font-[var(--font-inter)] text-[12px] font-medium text-[var(--OffBlack)] disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      Prev
                    </button>

                    <p className="font-[var(--font-inter)] text-[12px] text-[var(--OffBlack)]/75">
                      Page {formPage} of {totalFormPages}
                    </p>

                    <button
                      type="button"
                      onClick={() => setFormPage((prev) => Math.min(totalFormPages, prev + 1))}
                      disabled={formPage === totalFormPages}
                      className="rounded-md border border-[var(--OffBlack)]/12 px-3 py-1.5 font-[var(--font-inter)] text-[12px] font-medium text-[var(--OffBlack)] disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      Next
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </section>
      </div>

      <Downbar />

      {deleteTarget ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 px-5">
          <div className="w-full max-w-[320px] rounded-2xl bg-white p-5 shadow-xl">
            <p className="font-[var(--font-poppins)] text-base font-medium text-[var(--OffBlack)]">Delete Form</p>
            <p className="mt-2 font-[var(--font-inter)] text-sm text-[var(--OffBlack)]/70">
              Are you sure you want to delete this form? This action cannot be undone.
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-[color:var(--OffBlack)]/15 px-4 py-2 font-[var(--font-inter)] text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteTarget && handleDelete(deleteTarget.id)}
                className="rounded-lg bg-red-600 px-4 py-2 font-[var(--font-inter)] text-sm text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}