export interface WorkflowStep {
  step: string;
  title: string;
  description: string;
}

export const workflowSteps: WorkflowStep[] = [
  {
    step: "01",
    title: "Konsultasi",
    description: "Diskusi kebutuhan proyek, referensi, dan target website.",
  },
  {
    step: "02",
    title: "Desain",
    description: "Penyusunan wireframe dan desain visual antarmuka.",
  },
  {
    step: "03",
    title: "Develop",
    description: "Proses coding frontend, backend, dan database terintegrasi.",
  },
  {
    step: "04",
    title: "Revisi",
    description: "Pengecekan hasil bersama dan penyesuaian detail.",
  },
  {
    step: "05",
    title: "Launch",
    description: "Deploy ke server, konfigurasi domain & SSL, serah terima.",
  },
];
