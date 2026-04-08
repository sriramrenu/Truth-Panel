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

const DEFAULT_EMPLOYEES_PER_PAGE = 10;

const getCountFontClass = (value: number) => {
  const digits = String(Math.abs(value)).length;

  if (digits >= 7) return 'text-xl';
  if (digits >= 5) return 'text-2xl';
  return 'text-3xl';
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
  const [employeePage, setEmployeePage] = useState(1);
  const [employeesPerPage, setEmployeesPerPage] = useState(DEFAULT_EMPLOYEES_PER_PAGE);
  const [formOptions, setFormOptions] = useState<string[]>([]);
  const [surveysRaw, setSurveysRaw] = useState<any[]>([]);
  const [selectedForm, setSelectedForm] = useState('');
  const [selectedPieData, setSelectedPieData] = useState<PieEntry[]>([{ name: 'Submitted', value: 0 }, { name: 'Pending', value: 0 }]);
  
  const [showAddEmp, setShowAddEmp] = useState(false);
  const [empEmail, setEmpEmail] = useState('');
  const [empPassword, setEmpPassword] = useState('');
  const [isCreatingEmp, setIsCreatingEmp] = useState(false);

  const submittedValue = selectedPieData[0]?.value ?? 0;
  const pendingValue = selectedPieData[1]?.value ?? 0;
  const totalEmployeePages = Math.max(1, Math.ceil(employees.length / employeesPerPage));
  const employeeStartIndex = (employeePage - 1) * employeesPerPage;
  const paginatedEmployees = employees.slice(employeeStartIndex, employeeStartIndex + employeesPerPage);

  useEffect(() => {
    if (employeePage > totalEmployeePages) {
      setEmployeePage(totalEmployeePages);
    }
  }, [employeePage, totalEmployeePages]);

  useEffect(() => {
    setEmployeePage(1);
  }, [employeesPerPage]);

  useEffect(() => {
    setIsMounted(true);
    const loadDashboard = async () => {
      try {
        const { fetchAllSurveys, fetchEmployees } = await import('../../../../utils/api');
        
        let surveysCount = 0;
        let empsCount = 0;
        
        // Fetch surveys and employees concurrently
        const [res, empRes] = await Promise.all([
          fetchAllSurveys(),
          fetchEmployees()
        ]);

        if (res?.success) {
          const surveys = res.data || [];
          surveysCount = surveys.length;
          setSurveysRaw(surveys);
          setFormOptions(surveys.map((s: any) => s.title || 'Untitled'));
          if (surveys.length > 0) setSelectedForm(surveys[0].title || 'Untitled');
        }

        if (empRes?.success) {
           setEmployees(empRes.employees.map((e: any) => ({ name: e.name, designation: e.email })));
           empsCount = empRes.count;
        }
        
        setStats({ forms: surveysCount, employees: empsCount });

      } catch (err) {
        console.error('Failed to load admin dashboard', err);
      }
    };
    loadDashboard();
  }, []);

  useEffect(() => {
    if (!selectedForm || surveysRaw.length === 0 || stats.employees === 0) return;
     
    const matchedSurvey = surveysRaw.find(s => (s.title || 'Untitled') === selectedForm);
    if (matchedSurvey) {
        // Calculate distinct worker submissions leveraging Supabase nested relational schema
        const uniqueUsers = new Set();
        (matchedSurvey.Sessions || []).forEach((session: any) => {
            (session.Responses || []).forEach((response: any) => {
                if (response.user_id) uniqueUsers.add(response.user_id);
            });
        });
         
        const submitted = uniqueUsers.size;
        const totalWorkers = stats.employees;
        
        const submittedPercent = totalWorkers > 0 ? Math.round((submitted / totalWorkers) * 100) : 0;
        const pendingPercent = 100 - submittedPercent;
         
        setSelectedPieData([
            { name: 'Submitted', value: submittedPercent },
            { name: 'Pending', value: pendingPercent }
        ]);
    }
  }, [selectedForm, surveysRaw, stats.employees]);

  const handleAddEmployee = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsCreatingEmp(true);
      try {
          const { createEmployee, fetchEmployees } = await import('../../../../utils/api');
          const res = await createEmployee(empEmail, empPassword);
          if (res.success) {
              setShowAddEmp(false);
              setEmpEmail('');
              setEmpPassword('');
              
              const empRes = await fetchEmployees();
              if (empRes?.success) {
                  setEmployees(empRes.employees.map((em: any) => ({ name: em.name, designation: em.email })));
                  setStats(prev => ({ ...prev, employees: empRes.count }));
              }
          } else {
              alert(res.error || 'Failed to create employee');
          }
      } catch (err) {
          alert('Error creating employee');
      }
      setIsCreatingEmp(false);
  };

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
              <p
                className={`mt-3 font-[var(--font-inter)] ${getCountFontClass(stats.forms)} font-bold text-[var(--OffBlack)]`}
              >
                {stats.forms}
              </p>
            </article>

            <article className="rounded-xl bg-white p-4 shadow-sm">
              <p className="font-[var(--font-poppins)] text-[12px] font-medium text-[var(--PBlue)]">
                No. of Employees
              </p>
              <p
                className={`mt-3 font-[var(--font-inter)] ${getCountFontClass(stats.employees)} font-bold text-[var(--OffBlack)]`}
              >
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
 
            <h2 className="font-[var(--font-poppins)] text-[18px] font-medium text-[var(--OffBlack)]/70 mt-[24px]">
              {selectedForm}
            </h2>

            <div className="relative  w-full" style={{ height: 250 }}>
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
              <div>
                <h2 className="font-[var(--font-poppins)] text-[15px] font-medium text-[var(--OffBlack)]">
                  Employees
                </h2>
                <div className="mt-2 flex items-center gap-2">
                  <span className="font-[var(--font-inter)] text-[11px] font-medium uppercase tracking-wide text-[var(--OffBlack)]/65">
                    Show
                  </span>
                  <select
                    value={employeesPerPage}
                    onChange={(event) => setEmployeesPerPage(Number(event.target.value))}
                    className="h-7 rounded-md border border-[color:var(--OffBlack)]/12 bg-[var(--OffWhite)] px-2 font-[var(--font-inter)] text-[12px] text-[var(--OffBlack)] outline-none"
                    aria-label="Employees per page"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAddEmp(true)}
                className="rounded-lg bg-[var(--PBlue)] px-3 py-1.5 font-[var(--font-inter)] text-[12px] font-medium text-white"
              >
                Add Emp
              </button>
            </div>

            <div className="max-h-[220px] overflow-y-auto">
              {employees.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm font-medium text-gray-500">No employees listed</div>
              ) : (
                paginatedEmployees.map((employee, index) => (
                  <article
                    key={employee.designation}
                    className={`flex items-center gap-3 px-4 py-3 ${
                      index !== paginatedEmployees.length - 1 ? 'border-b border-[color:var(--OffBlack)]/8' : ''
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

            {employees.length > employeesPerPage ? (
              <div className="flex items-center justify-between border-t border-[color:var(--OffBlack)]/8 px-4 py-3">
                <button
                  type="button"
                  onClick={() => setEmployeePage((prev) => Math.max(1, prev - 1))}
                  disabled={employeePage === 1}
                  className="rounded-md border border-[var(--OffBlack)]/12 px-3 py-1.5 font-[var(--font-inter)] text-[12px] font-medium text-[var(--OffBlack)] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Prev
                </button>

                <p className="font-[var(--font-inter)] text-[12px] text-[var(--OffBlack)]/75">
                  Page {employeePage} of {totalEmployeePages}
                </p>

                <button
                  type="button"
                  onClick={() => setEmployeePage((prev) => Math.min(totalEmployeePages, prev + 1))}
                  disabled={employeePage === totalEmployeePages}
                  className="rounded-md border border-[var(--OffBlack)]/12 px-3 py-1.5 font-[var(--font-inter)] text-[12px] font-medium text-[var(--OffBlack)] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Next
                </button>
              </div>
            ) : null}
          </section>
        </section>
      </div>
      <Downbar />

      {/* Add Employee Modal/Sheet */}
      {showAddEmp && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 backdrop-blur-sm">
          <div className="w-full rounded-t-3xl bg-white p-6 pb-12 shadow-xl border-t border-[var(--OffBlack)]/10 animate-slide-up">
            <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-[var(--OffBlack)]/10" />
            <h2 className="font-[var(--font-poppins)] text-lg font-medium text-[var(--OffBlack)]">Add New Employee</h2>
            <p className="font-[var(--font-inter)] text-sm text-[var(--OffBlack)]/60 mb-6 mt-1">Provide employee email credentials. They will use this to sign into the worker portal.</p>
            
            <form className="space-y-4" onSubmit={handleAddEmployee}>
                <div>
                  <label className="font-[var(--font-inter)] text-xs font-semibold text-[var(--OffBlack)]/70 uppercase tracking-widest pl-1 mb-2 block">Email Address</label>
                  <input
                    type="email"
                    required
                    value={empEmail}
                    onChange={(e) => setEmpEmail(e.target.value)}
                    className="w-full rounded-xl border border-[var(--OffBlack)]/10 bg-[var(--OffWhite)] px-4 py-3.5 font-[var(--font-inter)] text-sm text-[var(--OffBlack)] outline-none focus:border-[var(--PBlue)]"
                    placeholder="worker@truthpanel.com"
                  />
                </div>
                <div>
                  <label className="font-[var(--font-inter)] text-xs font-semibold text-[var(--OffBlack)]/70 uppercase tracking-widest pl-1 mb-2 block">Initial Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={empPassword}
                    onChange={(e) => setEmpPassword(e.target.value)}
                    className="w-full rounded-xl border border-[var(--OffBlack)]/10 bg-[var(--OffWhite)] px-4 py-3.5 font-[var(--font-inter)] text-sm text-[var(--OffBlack)] outline-none focus:border-[var(--PBlue)]"
                    placeholder="Provide a secure password"
                  />
                </div>
                
                <div className="mt-8 flex items-center justify-between gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddEmp(false)}
                      className="w-1/3 rounded-xl border border-[var(--OffBlack)]/10 bg-[var(--OffWhite)] py-3.5 font-[var(--font-poppins)] text-sm font-medium text-[var(--OffBlack)]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isCreatingEmp}
                      className="w-2/3 rounded-xl bg-[var(--PBlue)] py-3.5 font-[var(--font-poppins)] text-sm font-medium text-white shadow-lg shadow-[var(--PBlue)]/20"
                    >
                      {isCreatingEmp ? 'Creating...' : 'Create Employee'}
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}