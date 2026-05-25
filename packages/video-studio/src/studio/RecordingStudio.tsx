import React, { useState, useEffect } from 'react';

interface Project {
  id: string;
  name: string;
  createdAt: Date;
  status: 'recording' | 'idle' | 'rendering' | 'completed';
  duration: number;
  frameCount: number;
}

interface Recording {
  id: string;
  projectId: string;
  name: string;
  startTime: Date;
  endTime?: Date;
  status: 'recording' | 'paused' | 'completed';
  duration: number;
}

export const RecordingStudio: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [currentRecording, setCurrentRecording] = useState<Recording | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [projectName, setProjectName] = useState('');

  // Load from localStorage on mount
  useEffect(() => {
    const savedProjects = localStorage.getItem('video_projects');
    const savedRecordings = localStorage.getItem('video_recordings');

    if (savedProjects) {
      const parsed = JSON.parse(savedProjects) as Array<{
        id: string;
        name: string;
        createdAt: string | number;
        status: Project['status'];
        duration: number;
        frameCount: number;
      }>;
      setProjects(
        parsed.map((p) => ({
          ...p,
          createdAt: new Date(p.createdAt),
        }))
      );
    }

    if (savedRecordings) {
      const parsed = JSON.parse(savedRecordings) as Array<{
        id: string;
        projectId: string;
        name: string;
        startTime: string | number;
        endTime?: string | number;
        status: Recording['status'];
        duration: number;
      }>;
      setRecordings(
        parsed.map((r) => ({
          ...r,
          startTime: new Date(r.startTime),
          endTime: r.endTime ? new Date(r.endTime) : undefined,
        }))
      );
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('video_projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('video_recordings', JSON.stringify(recordings));
  }, [recordings]);

  const createProject = () => {
    if (!projectName.trim()) return;

    const newProject: Project = {
      id: `proj_${Date.now()}`,
      name: projectName,
      createdAt: new Date(),
      status: 'idle',
      duration: 0,
      frameCount: 0,
    };

    setProjects([...projects, newProject]);
    setActiveProject(newProject);
    setProjectName('');
    setShowNewProject(false);
  };

  const startRecording = () => {
    if (!activeProject) return;

    const newRecording: Recording = {
      id: `rec_${Date.now()}`,
      projectId: activeProject.id,
      name: `Recording ${new Date().toLocaleTimeString()}`,
      startTime: new Date(),
      status: 'recording',
      duration: 0,
    };

    setCurrentRecording(newRecording);
    setRecordings([...recordings, newRecording]);
    setIsRecording(true);
    setActiveProject({ ...activeProject, status: 'recording' });
  };

  const stopRecording = () => {
    if (!currentRecording || !activeProject) return;

    const endTime = new Date();
    const duration = (endTime.getTime() - currentRecording.startTime.getTime()) / 1000;

    const updatedRecording = {
      ...currentRecording,
      endTime,
      status: 'completed' as const,
      duration,
    };

    setRecordings(recordings.map((r) => (r.id === currentRecording.id ? updatedRecording : r)));

    setActiveProject({
      ...activeProject,
      status: 'idle',
      duration: activeProject.duration + duration,
      frameCount: activeProject.frameCount + Math.floor(duration * 30),
    });

    setCurrentRecording(null);
    setIsRecording(false);
  };

  const deleteProject = (projectId: string) => {
    setProjects(projects.filter((p) => p.id !== projectId));
    setRecordings(recordings.filter((r) => r.projectId !== projectId));
    if (activeProject?.id === projectId) {
      setActiveProject(null);
    }
  };

  const projectRecordings = activeProject
    ? recordings.filter((r) => r.projectId === activeProject.id)
    : [];

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        backgroundColor: '#0f0f1e',
        color: '#ffffff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Sidebar - Projects */}
      <div
        style={{
          width: '280px',
          borderRight: '1px solid rgba(0, 217, 255, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px',
          overflow: 'auto',
        }}
      >
        <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 700 }}>📁 Projects</h2>

        {!showNewProject ? (
          <button
            onClick={() => setShowNewProject(true)}
            style={{
              padding: '12px 16px',
              background: 'linear-gradient(135deg, #00d9ff, #0099cc)',
              color: '#000',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: '20px',
            }}
          >
            + New Project
          </button>
        ) : (
          <div style={{ marginBottom: '20px' }}>
            <input
              type='text'
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder='Project name...'
              style={{
                width: '100%',
                padding: '8px 12px',
                background: '#1a1a2e',
                border: '1px solid rgba(0, 217, 255, 0.2)',
                borderRadius: '6px',
                color: '#fff',
                marginBottom: '8px',
                fontSize: '14px',
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') createProject();
              }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={createProject}
                style={{
                  flex: 1,
                  padding: '8px',
                  background: '#00d9ff',
                  color: '#000',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                Create
              </button>
              <button
                onClick={() => setShowNewProject(false)}
                style={{
                  flex: 1,
                  padding: '8px',
                  background: '#333',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Project List */}
        <div style={{ flex: 1 }}>
          {projects.length === 0 ? (
            <p style={{ color: '#666', fontSize: '14px', marginTop: '20px' }}>
              No projects yet. Create one to get started.
            </p>
          ) : (
            projects.map((project) => (
              <div
                key={project.id}
                onClick={() => setActiveProject(project)}
                style={{
                  padding: '12px',
                  background:
                    activeProject?.id === project.id ? 'rgba(0, 217, 255, 0.15)' : 'transparent',
                  border:
                    activeProject?.id === project.id
                      ? '1px solid rgba(0, 217, 255, 0.3)'
                      : '1px solid rgba(0, 217, 255, 0.1)',
                  borderRadius: '8px',
                  marginBottom: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: '14px' }}>{project.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteProject(project.id);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#ff6b6b',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    ✕
                  </button>
                </div>
                <div style={{ fontSize: '12px', color: '#999' }}>
                  {projectRecordings.length} recording
                  {projectRecordings.length !== 1 ? 's' : ''}
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  {(project.duration / 60).toFixed(1)}m • {project.frameCount} frames
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px',
            borderBottom: '1px solid rgba(0, 217, 255, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>
            {activeProject ? `🎬 ${activeProject.name}` : 'Recording Studio'}
          </h1>
          <div style={{ display: 'flex', gap: '12px' }}>
            {activeProject && (
              <>
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  style={{
                    padding: '12px 24px',
                    background: isRecording
                      ? '#ff6b6b'
                      : 'linear-gradient(135deg, #00d9ff, #0099cc)',
                    color: '#000',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  {isRecording ? '⏹ Stop Recording' : '⏺ Start Recording'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        {!activeProject ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#666',
              fontSize: '16px',
            }}
          >
            Select a project or create a new one to start recording
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {/* Recording Preview */}
            <div
              style={{
                flex: 2,
                padding: '20px',
                borderRight: '1px solid rgba(0, 217, 255, 0.1)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <h2 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: 600 }}>Preview</h2>
              <div
                style={{
                  flex: 1,
                  background: '#1a1a2e',
                  borderRadius: '8px',
                  border: '1px solid rgba(0, 217, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#666',
                  minHeight: '300px',
                }}
              >
                {isRecording ? (
                  <div style={{ textAlign: 'center' }}>
                    <div
                      style={{
                        fontSize: '48px',
                        marginBottom: '16px',
                        animation: 'pulse 1s infinite',
                      }}
                    >
                      🔴
                    </div>
                    <div style={{ fontSize: '14px' }}>Recording in progress...</div>
                  </div>
                ) : (
                  <div style={{ fontSize: '14px' }}>Recording preview</div>
                )}
              </div>
            </div>

            {/* Recordings List */}
            <div
              style={{
                flex: 1,
                padding: '20px',
                overflow: 'auto',
              }}
            >
              <h2 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: 600 }}>
                Recordings ({projectRecordings.length})
              </h2>

              {projectRecordings.length === 0 ? (
                <p style={{ color: '#666', fontSize: '14px' }}>
                  No recordings yet. Start recording to begin.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {projectRecordings.map((recording) => (
                    <div
                      key={recording.id}
                      style={{
                        padding: '12px',
                        background: 'rgba(0, 217, 255, 0.05)',
                        border: '1px solid rgba(0, 217, 255, 0.1)',
                        borderRadius: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '14px' }}>{recording.name}</div>
                          <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                            {recording.startTime.toLocaleTimeString()}
                          </div>
                        </div>
                        <div
                          style={{
                            textAlign: 'right',
                          }}
                        >
                          <div
                            style={{
                              fontSize: '12px',
                              color: recording.status === 'completed' ? '#00d9ff' : '#ffa500',
                            }}
                          >
                            {recording.status}
                          </div>
                          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                            {(recording.duration / 60).toFixed(1)}m
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};
