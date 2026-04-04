'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Downbar from '../../Components/Downbar';
import Navbar from '../../Components/Navbar';


export default function Forms() {
  

  return (
    <main className="min-h-screen bg-[var(--OffWhite)] text-[var(--OffBlack)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[390px] flex-col pb-28">
        <Navbar />

        <h1 className="mt-10 px-5 text-2xl font-bold">Forms</h1>
        <p className="mt-2 px-5 text-sm text-[var(--OffBlack)]">
          Manage the forms in your organization, view responses, and gain insights.
        </p>
      </div>


      <Downbar />
    </main>
  );
}