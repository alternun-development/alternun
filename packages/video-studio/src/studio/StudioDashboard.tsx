import React, { useState, useEffect } from 'react';
import { Recorder } from './Recorder';

interface Project {
  id: string;
  name: string;
  createdAt: number;
  composition: string;
}

export const StudioDashboard: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [newProjectName, setNewProjectName] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('video_projects');
    if (saved) {
      setProjects(JSON.parse(saved) as Project[]);
    }
  }, []);

  const createProject = () => {
    if (!newProjectName.trim()) return;

    const project: Project = {
      id: `proj-${Date.now()}`,
      name: newProjectName,
      createdAt: Date.now(),
      composition: 'AirsDemo',
    };

    const updated = [...projects, project];
    setProjects(updated);
    localStorage.setItem('video_projects', JSON.stringify(updated));
    setNewProjectName('');
    setCurrentProject(project);
  };

  const deleteProject = (id: string) => {
    const updated = projects.filter((p) => p.id !== id);
    setProjects(updated);
    localStorage.setItem('video_projects', JSON.stringify(updated));
    if (currentProject?.id === id) {
      setCurrentProject(null);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 100%)',
        color: '#fff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '20px',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{ margin: '0 0 8px 0', color: '#00d9ff', fontSize: '32px' }}>
            🎬 AIRS Studio
          </h1>
          <p style={{ margin: '0', color: '#a0a0a0', fontSize: '14px' }}>
            Professional video production & recording management
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px' }}>
          {/* Sidebar - Projects */}
          <div
            style={{
              background: 'rgba(0, 217, 255, 0.05)',
              border: '1px solid rgba(0, 217, 255, 0.2)',
              borderRadius: '8px',
              padding: '20px',
              height: 'fit-content',
            }}
          >
            <h3 style={{ margin: '0 0 16px 0', color: '#00d9ff', fontSize: '14px' }}>
              📁 PROJECTS
            </h3>

            <div style={{ marginBottom: '16px' }}>
              <input
                type='text'
                placeholder='New project...'
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && createProject()}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: '#0f0f1e',
                  border: '1px solid rgba(0, 217, 255, 0.2)',
                  borderRadius: '4px',
                  color: '#fff',
                  marginBottom: '8px',
                  fontSize: '12px',
                  boxSizing: 'border-box',
                }}
              />
              <button
                onClick={createProject}
                disabled={!newProjectName.trim()}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: '#00d9ff',
                  color: '#000',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '12px',
                  opacity: newProjectName.trim() ? 1 : 0.5,
                }}
              >
                + New Project
              </button>
            </div>

            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {projects.length === 0 ? (
                <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>No projects yet</p>
              ) : (
                projects.map((proj) => (
                  <div
                    key={proj.id}
                    onClick={() => setCurrentProject(proj)}
                    style={{
                      padding: '10px',
                      background:
                        currentProject?.id === proj.id ? 'rgba(0, 217, 255, 0.2)' : 'transparent',
                      border: '1px solid rgba(0, 217, 255, 0.1)',
                      borderRadius: '4px',
                      marginBottom: '8px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span>{proj.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteProject(proj.id);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ff4444',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Main Content */}
          <div>
            {currentProject ? (
              <div style={{ display: 'grid', gap: '20px' }}>
                <div
                  style={{
                    background: 'rgba(0, 217, 255, 0.05)',
                    border: '1px solid rgba(0, 217, 255, 0.2)',
                    borderRadius: '8px',
                    padding: '20px',
                  }}
                >
                  <h2 style={{ margin: '0 0 12px 0', color: '#00d9ff' }}>{currentProject.name}</h2>
                  <p style={{ margin: '0', fontSize: '12px', color: '#a0a0a0' }}>
                    Composition: {currentProject.composition}
                    <br />
                    Created: {new Date(currentProject.createdAt).toLocaleString()}
                  </p>
                </div>

                {/* Recorder Component */}
                <Recorder
                  composition={currentProject.composition}
                  fps={30}
                  onRecordingStart={(session) => {
                    console.log('Recording started:', session);
                  }}
                  onRecordingStop={(session) => {
                    console.log('Recording stopped:', session);
                  }}
                />

                {/* Preview Info */}
                <div
                  style={{
                    background: 'rgba(0, 217, 255, 0.05)',
                    border: '1px solid rgba(0, 217, 255, 0.2)',
                    borderRadius: '8px',
                    padding: '20px',
                  }}
                >
                  <h3 style={{ margin: '0 0 12px 0', color: '#00d9ff' }}>📺 Video Information</h3>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '12px',
                      fontSize: '12px',
                    }}
                  >
                    <div>
                      <strong>Resolution:</strong> 1440×810 (16:9)
                    </div>
                    <div>
                      <strong>FPS:</strong> 30
                    </div>
                    <div>
                      <strong>Duration:</strong> 180 seconds (3 min)
                    </div>
                    <div>
                      <strong>Total Frames:</strong> 5400
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  background: 'rgba(0, 217, 255, 0.05)',
                  border: '1px dashed rgba(0, 217, 255, 0.3)',
                  borderRadius: '8px',
                  padding: '40px',
                  textAlign: 'center',
                  color: '#a0a0a0',
                }}
              >
                <p style={{ margin: 0, fontSize: '16px' }}>
                  👈 Create or select a project to begin recording
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
