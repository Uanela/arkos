import React from "react";

export default function TestimonialCard({
  name,
  role,
  projectName,
  avatar,
  children,
}: {
  name: string;
  role: string;
  projectName: React.ReactNode;
  avatar: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-900 rounded-2xl p-6 border  hover:border-slate-600 transition-all duration-300 max-w-md h-full flex flex-col justify-between">
      <p className="text-slate-200 text-base leading-relaxed mb-6 text-left">
        {children}
      </p>

      <div className="flex items-center gap-3">
        <img
          src={avatar}
          alt={name}
          className="w-12 h-12 rounded-full object-cover ring-2 ring-sky-500"
        />

        <div className="flex flex-col">
          <span className="text-white font-medium text-sm">{name}</span>
          <span className="text-slate-400 text-sm">
            {role} / <span className="text-sky-400">{projectName}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
