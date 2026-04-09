'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import WDownbar from '../../Components/WDownbar';
import WNavbar from '../../Components/WNavbar';

interface FormQuestion {
	id: string;
	type: 'multiple_choice' | 'checkboxes' | 'short_text';
	questionText: string;
	options?: string[];
}

interface TruthPanelForm {
	id: string;
	title: string;
	description: string;
	createdAt: string;
	endTime: string | null;
	questions: FormQuestion[];
}

interface QuestionAnswer {
	questionId: string;
	questionText: string;
	answer: string | string[];
}

interface FormResponse {
	responseId: string;
	formId: string;
	formTitle: string;
	submittedAt: string;
	workerEmail: string;
	workerName: string;
	answers: QuestionAnswer[];
}

type SortOption = 'latest' | 'oldest' | 'name';


export default function WorkerFormsPage() {
	const router = useRouter();
	const [forms, setForms] = useState<TruthPanelForm[]>([]);
	const [submittedFormIds, setSubmittedFormIds] = useState<string[]>([]);
	const [sortOption, setSortOption] = useState<SortOption>('latest');

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

	useEffect(() => {
		const user = (() => {
			try { return JSON.parse(sessionStorage.getItem('truth_panel_user') || ''); } catch { return null; }
		})();
		if (!user) { router.push('/Frontend/Login'); return; }

		const loadForms = async () => {
			try {
				const { fetchAllSurveys, fetchActiveSession, checkUserSubmission } = await import('../../../../utils/api');
				const res = await fetchAllSurveys();
				if (res?.success) {
					const normalized = (res.data || []).map((s: any) => ({
						id: s.id,
						title: s.title,
						description: s.description || '',
						createdAt: s.created_at,
						endTime: s.end_time || null,
						questions: s.Questions || [],
					}));
					setForms(normalized);

					// Check which surveys the worker already responded to
					const submittedIds: string[] = [];
					for (const survey of normalized) {
						try {
							const sessionRes = await fetchActiveSession(survey.id, survey.endTime);
							if (sessionRes?.success && sessionRes.session?.id) {
								const checkRes = await checkUserSubmission(sessionRes.session.id);
								if (checkRes?.already_submitted) submittedIds.push(survey.id);
							}
						} catch { /* ignore per-survey errors */ }
					}
					setSubmittedFormIds(submittedIds);
				}
			} catch (err) {
				console.error('Failed to load surveys', err);
			}
		};
		loadForms();
	}, [router]);

	const isSubmitted = (formId: string) => submittedFormIds.includes(formId);

	return (
		<main className="min-h-screen bg-[var(--OffWhite)] text-[var(--OffBlack)]">
			<div className="mx-auto flex min-h-screen w-full max-w-[390px] flex-col pb-24">
				<WNavbar />

				<section className="flex-1 px-4 py-4">
					<div className="mb-3 flex justify-between items-center">
						<h1 className="font-[var(--font-poppins)] text-2xl font-medium text-[var(--OffBlack)]">Forms</h1>
						<select
							value={sortOption}
							onChange={(event) => setSortOption(event.target.value as SortOption)}
							className="h-8 rounded-lg border border-[color:var(--OffBlack)]/15 bg-white px-2 font-[var(--font-inter)] text-xs text-[var(--OffBlack)] outline-none"
							aria-label="Sort forms"
						>
							<option value="latest">Latest</option>
							<option value="oldest">Oldest</option>
							<option value="name">Name (A-Z)</option>
						</select>
					</div>

					{sortedForms.length === 0 ? (
						<div className="flex h-full min-h-[55vh] flex-col items-center justify-center text-center">
							<div className="mb-4 flex h-24 w-24 items-center justify-center rounded-2xl bg-white shadow-sm">
								<svg width="52" height="52" viewBox="0 0 52 52" fill="none" aria-hidden="true">
									<rect x="10" y="8" width="32" height="36" rx="6" stroke="var(--PBlue)" strokeWidth="2" />
									<path d="M18 20H34M18 27H34M18 34H28" stroke="var(--PBlue)" strokeWidth="2" strokeLinecap="round" />
								</svg>
							</div>
							<p className="font-[var(--font-inter)] text-sm font-normal text-[color:rgba(13,22,11,0.6)]">
								No forms assigned yet
							</p>
						</div>
					) : (
						<div className="overflow-hidden rounded-xl bg-white">
							{sortedForms.map((form, index) => {
								const completed = isSubmitted(form.id);
								const expired = form.endTime ? new Date() > new Date(form.endTime) : false;

								return (
									<button
										key={`${form.id}-${index}`}
										type="button"
										disabled={completed || expired}
										onClick={() => router.push(`/Frontend/WorkerPanel/Forms/Attend?id=${encodeURIComponent(form.id)}`)}
										className={`flex w-full items-center justify-between gap-3 px-4 py-4 text-left ${
											index !== sortedForms.length - 1 ? 'border-b border-[color:rgba(13,22,11,0.08)]' : ''
										} ${(completed || expired) ? 'pointer-events-none opacity-60' : ''}`}
									>
										<div className="min-w-0">
											<p className="truncate font-[var(--font-poppins)] text-sm font-medium text-[var(--OffBlack)]">
												{form.title || 'Untitled Form'}
											</p>
											<p className="truncate font-[var(--font-inter)] text-xs font-light text-[color:rgba(13,22,11,0.6)]">
												{form.description || 'No description'}
											</p>
										</div>

										{completed ? (
											<span className="rounded-full bg-[var(--PBlue)] px-3 py-1 font-[var(--font-poppins)] text-[10px] font-medium text-[var(--OffWhite)]">
												Completed
											</span>
										) : expired ? (
											<span className="rounded-full bg-red-50 border border-red-100 px-3 py-1 font-[var(--font-poppins)] text-[10px] font-medium text-red-500">
												Expired
											</span>
										) : (
											<span className="font-[var(--font-poppins)] text-xl text-[var(--PBlue)]">›</span>
										)}
									</button>
								);
							})}
						</div>
					)}
				</section>
			</div>

			<WDownbar />
		</main>
	);
}
