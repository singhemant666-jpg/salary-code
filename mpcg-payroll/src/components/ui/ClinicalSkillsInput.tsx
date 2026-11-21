'use client';

import React, { useState } from 'react';
import { Stethoscope, Plus, X, Check, Sparkles, Activity } from 'lucide-react';

export const CLINICAL_SKILL_PRESETS = [
  {
    id: 'advanced-physio',
    name: 'Advanced Physiotherapy',
    detail: 'Manual Therapy, Osteopathy, Chiropractic, Dry Needling',
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.12)',
    borderColor: 'rgba(139, 92, 246, 0.35)',
  },
  {
    id: 'modalities',
    name: 'Modalities',
    detail: 'IFT, Ultrasound, Laser, Traction, TENS, Heat/Cryo',
    color: '#06b6d4',
    bgColor: 'rgba(6, 182, 212, 0.12)',
    borderColor: 'rgba(6, 182, 212, 0.35)',
  },
  {
    id: 'wellness',
    name: 'Wellness & Fitness',
    detail: 'Ergonomics, Posture Correction, Core & Strength Training',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  {
    id: 'ortho',
    name: 'Orthopedic Rehab',
    detail: 'Spine, Knee, Shoulder, Joint Replacements & Fractures',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.12)',
    borderColor: 'rgba(59, 130, 246, 0.35)',
  },
  {
    id: 'neuro',
    name: 'Neuro Rehab',
    detail: 'Stroke, Parkinson’s, Paralysis, Balance & Gait',
    color: '#ec4899',
    bgColor: 'rgba(236, 72, 153, 0.12)',
    borderColor: 'rgba(236, 72, 153, 0.35)',
  },
  {
    id: 'sports',
    name: 'Sports Injury Rehab',
    detail: 'Ligament Tears, Athletic Conditioning, Return to Sport',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  {
    id: 'pediatric',
    name: 'Pediatric Physiotherapy',
    detail: 'Developmental Milestones, Cerebral Palsy, Posture',
    color: '#14b8a6',
    bgColor: 'rgba(20, 184, 166, 0.12)',
    borderColor: 'rgba(20, 184, 166, 0.35)',
  },
];

export function parseClinicalSkills(raw?: string | string[] | null): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(String).map((s) => s.trim()).filter(Boolean);
  } catch {
    // Comma-separated fallback
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

interface ClinicalSkillsInputProps {
  initialSkills?: string | string[] | null;
}

export default function ClinicalSkillsInput({ initialSkills }: ClinicalSkillsInputProps) {
  const [selectedSkills, setSelectedSkills] = useState<string[]>(() =>
    parseClinicalSkills(initialSkills)
  );
  const [customInput, setCustomInput] = useState('');

  const toggleSkill = (skillName: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skillName) ? prev.filter((s) => s !== skillName) : [...prev, skillName]
    );
  };

  const handleAddCustom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = customInput.trim();
    if (!trimmed) return;
    if (!selectedSkills.includes(trimmed)) {
      setSelectedSkills((prev) => [...prev, trimmed]);
    }
    setCustomInput('');
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSelectedSkills((prev) => prev.filter((s) => s !== skillToRemove));
  };

  // Find any selected skills that aren't in the preset list
  const customSelected = selectedSkills.filter(
    (s) => !CLINICAL_SKILL_PRESETS.some((p) => p.name.toLowerCase() === s.toLowerCase())
  );

  return (
    <div className="glass-card-static" style={{ marginBottom: '1.5rem' }}>
      <input type="hidden" name="clinicalSkills" value={JSON.stringify(selectedSkills)} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(59, 130, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#3b82f6',
            }}
          >
            <Stethoscope size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              Clinical Skills, Specializations & Modalities
              <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa', fontWeight: 600 }}>
                AI Coverage Engine
              </span>
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Select all treatments and modalities this doctor/therapist handles. Used by AI to arrange replacements and prevent shortage during leave clashes.
            </p>
          </div>
        </div>

        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          <strong style={{ color: selectedSkills.length > 0 ? '#10b981' : 'inherit' }}>
            {selectedSkills.length}
          </strong>{' '}
          skill{selectedSkills.length === 1 ? '' : 's'} assigned
        </div>
      </div>

      {/* Preset Skill Buttons Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.65rem', marginTop: '1rem' }}>
        {CLINICAL_SKILL_PRESETS.map((preset) => {
          const isSelected = selectedSkills.includes(preset.name);
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => toggleSkill(preset.name)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                textAlign: 'left',
                padding: '0.7rem 0.85rem',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                border: isSelected ? `1.5px solid ${preset.color}` : '1px solid rgba(255, 255, 255, 0.1)',
                background: isSelected ? preset.bgColor : 'rgba(255, 255, 255, 0.02)',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '3px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.85rem', color: isSelected ? preset.color : 'var(--text-primary)' }}>
                  {preset.name}
                </span>
                <span
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isSelected ? preset.color : 'rgba(255, 255, 255, 0.08)',
                    color: '#ffffff',
                    fontSize: '11px',
                    flexShrink: 0,
                  }}
                >
                  {isSelected ? <Check size={12} strokeWidth={3} /> : null}
                </span>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                {preset.detail}
              </span>
            </button>
          );
        })}
      </div>

      {/* Custom Skills Section */}
      <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Sparkles size={13} style={{ color: '#f59e0b' }} /> Add Custom Clinical Skill / Modality
        </label>
        <div style={{ display: 'flex', gap: '0.5rem', maxWidth: '480px' }}>
          <input
            type="text"
            className="form-input"
            style={{ fontSize: '0.82rem', padding: '0.45rem 0.75rem' }}
            placeholder="e.g. Dry Needling, Cupping, Hydrotherapy, Ergonomics..."
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCustom();
              }
            }}
          />
          <button
            type="button"
            onClick={() => handleAddCustom()}
            className="btn btn-secondary"
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}
          >
            <Plus size={14} /> Add
          </button>
        </div>

        {/* Custom Selected Chips */}
        {customSelected.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.65rem' }}>
            {customSelected.map((skill) => (
              <span
                key={skill}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0.28rem 0.65rem',
                  borderRadius: '20px',
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  color: '#fbbf24',
                  fontSize: '0.78rem',
                  fontWeight: 500,
                }}
              >
                <span>{skill}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(skill)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: '#fbbf24',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title="Remove skill"
                >
                  <X size={13} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
