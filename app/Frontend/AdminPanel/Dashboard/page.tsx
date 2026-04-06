'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import Downbar from '@/app/Frontend/Components/Downbar';
import Navbar from "../../Components/Navbar";

type PieEntry = {
  name: string;
  value: number;
};

type Employee = {
  name: string;
  designation: string;
};

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  };

export default function DashboardPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [stats, setStats] = useState({ forms: 0, employees: 0 });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [formOptions, setFormOptions] = useState<string[]>([]);
  const [selectedForm, setSelectedForm] = useState('');
  const [selectedPieData, setSelectedPieData] = useState<PieEntry[]>([{ name: 'Submitted', value: 0 }, { name: 'Pending', value: 0 }]);
  
  const submittedValue = selectedPieData[0]?.value ?? 0;
  const pendingValue = selectedPieData[1]?.value ?? 0;

  useEffect(() => {
    setIsMounted(true);
    const loadDashboard = async () => {
      try {
        const { fetchAllSurveys } = await import('../../../../utils/api');
        const res = await fetchAllSurveys();
        if (res?.success) {
          const surveys = res.data || [];
          setStats({ forms: surveys.length, employees: 0 });
          setFormOptions(surveys.map((s: any) => s.title || 'Untitled'));
          if (surveys.length > 0) setSelectedForm(surveys[0].title || 'Untitled');
        }
      } catch (err) {
        console.error('Failed to load admin dashboard', err);
      }
    };
    loadDashboard();
  }, []);

  return (
    <main className="min-h-screen bg-[var(--OffWhite)] text-[var(--OffBlack)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[390px] flex-col pb-28">
        <Navbar />

        <section className="flex-1 space-y-4 px-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <article className="rounded-xl bg-white p-4 shadow-sm">
              <p className="font-[var(--font-poppins)] text-[12px] font-medium text-[var(--PBlue)]">
                No. of Forms
              </p>
              <p className="mt-3 font-[var(--font-inter)] text-3xl font-bold text-[var(--OffBlack)]">
                {stats.forms}
              </p>
            </article>

            <article className="rounded-xl bg-white p-4 shadow-sm">
              <p className="font-[var(--font-poppins)] text-[12px] font-medium text-[var(--PBlue)]">
                No. of Employees
              </p>
              <p className="mt-3 font-[var(--font-inter)] text-3xl font-bold text-[var(--OffBlack)]">
                {stats.employees}
              </p>
            </article>
          </div>

          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-[var(--font-poppins)] text-[15px] font-medium text-[var(--OffBlack)]">
                Forms Submitted
              </h2>
              <select
                value={selectedForm}
                onChange={(event) => setSelectedForm(event.target.value)}
                className="h-9 rounded-lg border border-[color:var(--OffBlack)]/12 bg-[var(--OffWhite)] px-3 font-[var(--font-inter)] text-[12px] text-[var(--OffBlack)] outline-none"
                aria-label="Select form"
              >
                {formOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative mt-4 w-full" style={{ height: 250 }}>
              {isMounted ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={selectedPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={82}
                      paddingAngle={3}
                      stroke="transparent"
                    >
                      {selectedPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? 'var(--PBlue)' : 'var(--SYellow)'} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              ) : null}

              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <p className="font-[var(--font-poppins)] text-[12px] font-medium text-[var(--OffBlack)]/70">
                  {selectedForm}
                </p>
                <p className="font-[var(--font-inter)] text-[34px] font-semibold leading-none text-[var(--OffBlack)]">
                  {submittedValue}%
                </p>
                <p className="mt-1 font-[var(--font-inter)] text-[11px] font-light text-[var(--OffBlack)]/60">
                  Submitted rate
                </p>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-center gap-5 font-[var(--font-inter)] text-[12px] text-[var(--OffBlack)]">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--PBlue)]" />
                <span>Submitted</span>
                <span className="font-medium">{submittedValue}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--SYellow)]" />
                <span>Pending</span>
                <span className="font-medium">{pendingValue}%</span>
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[color:var(--OffBlack)]/8 px-4 py-3">
              <h2 className="font-[var(--font-poppins)] text-[15px] font-medium text-[var(--OffBlack)]">
                Employees
              </h2>

              <button
                type="button"
                className="rounded-lg bg-[var(--PBlue)] px-3 py-1.5 font-[var(--font-inter)] text-[12px] font-medium text-white"
              >
                Add Emp
              </button>
            </div>

            <div className="max-h-[220px] overflow-y-auto">
              {employees.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm font-medium text-gray-500">No employees listed</div>
              ) : (
                employees.map((employee, index) => (
                  <article
                    key={employee.name}
                    className={`flex items-center gap-3 px-4 py-3 ${
                      index !== employees.length - 1 ? 'border-b border-[color:var(--OffBlack)]/8' : ''
                    }`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--PBlue)] font-[var(--font-poppins)] text-[13px] font-medium text-white">
                      {getInitials(employee.name)}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-[var(--font-poppins)] text-[14px] font-medium text-[var(--OffBlack)]">
                        {employee.name}
                      </p>
                      <p className="font-[var(--font-inter)] text-[12px] font-light text-[var(--OffBlack)]/65">
                        {employee.designation}
                      </p>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </section>
      </div>
      <Downbar />

    </main>
  );
}