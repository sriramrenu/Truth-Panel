'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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


export default function WorkerFormsPage() {
	const router = useRouter();
	const [forms, setForms] = useState<TruthPanelForm[]>([]);
	const [submittedFormIds, setSubmittedFormIds] = useState<string[]>([]);

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
						questions: s.Questions || [],
					}));
					setForms(normalized);

					// Check which surveys the worker already responded to
					const submittedIds: string[] = [];
					for (const survey of normalized) {
						try {
							const sessionRes = await fetchActiveSession(survey.id);
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
			<div className="mx-auto flex min-h-screen w-full max-w-[390px] flex-col pb-28">
				<header className="bg-white px-4 py-3 shadow-[0_1px_10px_rgba(13,22,11,0.08)]">
					<div className="flex items-center justify-between gap-3">
						<button
							type="button"
							onClick={() => router.push('/Frontend/WorkerPanel/Dashboard')}
							className="flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--OffBlack)]/15 font-[var(--font-poppins)] text-lg"
							aria-label="Back to worker dashboard"
						>
							{'<'}
						</button>

						<h1 className="font-[var(--font-poppins)] text-xl font-medium">My Forms</h1>

						<button
							type="button"
							onClick={() => router.push('/Frontend/WorkerPanel/Profile')}
							className="h-9 w-9 rounded-full"
							aria-label="Profile"
						>
							<img src="/ProfileIcon_rounded.svg" alt="Profile" className="h-6 w-6" />
						</button>
					</div>
				</header>

				<section className="flex-1 px-4 py-4">
					{forms.length === 0 ? (
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
							{forms.map((form, index) => {
								const completed = isSubmitted(form.id);

								return (
									<button
										key={`${form.id}-${index}`}
										type="button"
										disabled={completed}
										onClick={() => router.push(`/Frontend/WorkerPanel/Forms/Attend?id=${encodeURIComponent(form.id)}`)}
										className={`flex w-full items-center justify-between gap-3 px-4 py-4 text-left ${
											index !== forms.length - 1 ? 'border-b border-[color:rgba(13,22,11,0.08)]' : ''
										} ${completed ? 'pointer-events-none opacity-60' : ''}`}
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

			<nav className="fixed inset-x-0 bottom-0 z-20 flex justify-center">
				<div className="relative w-full max-w-[390px]">
					<div className="flex h-20 items-end justify-between rounded-t-[24px] bg-[var(--PBlue)] px-8 pb-3 pt-4 shadow-[0_-4px_18px_rgba(13,22,11,0.15)]">
						<button
							type="button"
							onClick={() => router.push('/Frontend/WorkerPanel/Dashboard')}
							className="flex flex-col items-center gap-1"
							aria-label="Dashboard"
						>
							<img src="/DashboardIcon_rounded.svg" alt="Dashboard" className="h-6 w-6 opacity-80" />
							<span className="font-[var(--font-inter)] text-[11px] text-[color:rgba(237,247,246,0.7)]">Dashboard</span>
						</button>

						<div className="w-20" />

						<button type="button" className="flex flex-col items-center gap-1" aria-label="Forms">
							<img src="/FormsIcon.svg" alt="Forms" className="h-6 w-6" />
							<span className="font-[var(--font-inter)] text-[11px] text-[var(--OffWhite)]">Forms</span>
						</button>
					</div>

					<button
						type="button"
						onClick={() => router.push('/Frontend/WorkerPanel/Wallet')}
						className="absolute left-1/2 top-[5px] flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--SYellow)] shadow-[0_10px_22px_rgba(13,22,11,0.18)]"
						aria-label="Wallet"
					>
						<span className="font-[var(--font-poppins)] text-2xl text-white">₹</span>
					</button>
				</div>
			</nav>
		</main>
	);
}
