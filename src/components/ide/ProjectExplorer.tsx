/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ES4 Studio 2002 - Project Explorer Tree View
 */

import React, { useState } from 'react';
import { Project, ProjectFile } from '../../types';
import { 
  Folder, 
  FolderOpen, 
  FileText, 
  Binary, 
  FileCode, 
  Plus, 
  Trash2, 
  Briefcase,
  FolderPlus
} from 'lucide-react';

interface ProjectExplorerProps {
  projects: Project[];
  activeProjectId: string;
  files: ProjectFile[];
  activeFileId: string;
  onSelectProject: (id: string) => void;
  onCreateProject: (name: string) => void;
  onDeleteProject: (id: string) => void;
  onSelectFile: (id: string) => void;
  onNewFile: () => void;
  onDeleteFile: (id: string) => void;
}

export const ProjectExplorer: React.FC<ProjectExplorerProps> = ({
  projects,
  activeProjectId,
  files,
  activeFileId,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
  onSelectFile,
  onNewFile,
  onDeleteFile,
}) => {
  const [isSrcOpen, setIsSrcOpen] = useState(true);
  const [isBinOpen, setIsBinOpen] = useState(true);
  const [showNewProjDialog, setShowNewProjDialog] = useState(false);
  const [newProjName, setNewProjName] = useState('');

  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0];
  const srcFiles = files.filter(f => f.type === 'es4');
  const binFiles = files.filter(f => f.type === 'es4b' || f.type === 'es4ir');

  const handleCreateProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProjName.trim()) {
      onCreateProject(newProjName.trim());
      setNewProjName('');
      setShowNewProjDialog(false);
    }
  };

  return (
    <div className="w-64 bg-[#ffffff] swing-bevel-sunken flex flex-col h-full select-none text-[11px] overflow-hidden">
      {/* Project Selector Header */}
      <div className="bg-[#ece9d8] p-1.5 border-b border-[#c0beb6] flex flex-col gap-1">
        <div className="flex items-center justify-between text-[#333]">
          <div className="flex items-center gap-1 font-bold text-[11px]">
            <Briefcase className="w-3.5 h-3.5 text-blue-900" />
            <span>Active Project:</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowNewProjDialog(true)}
              title="Create New Project"
              className="px-1.5 py-0.5 bg-[#d4d0c8] swing-bevel-raised hover:bg-[#ece9d8] active:swing-bevel-sunken flex items-center gap-1 text-[10px]"
            >
              <FolderPlus className="w-3 h-3 text-green-800" />
              <span>New</span>
            </button>
            {projects.length > 1 && (
              <button
                onClick={() => {
                  if (confirm(`Delete project "${activeProject.name}"?`)) {
                    onDeleteProject(activeProjectId);
                  }
                }}
                title="Delete Current Project"
                className="p-0.5 hover:bg-red-100 rounded-xs text-red-700"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Project Dropdown Selector */}
        <select
          value={activeProjectId}
          onChange={(e) => onSelectProject(e.target.value)}
          className="w-full bg-white border border-[#808080] py-0.5 px-1 font-sans text-[11px] font-semibold text-[#0a246a] focus:outline-none"
        >
          {projects.map((proj) => (
            <option key={proj.id} value={proj.id}>
              {proj.name} ({proj.files.filter(f => f.type === 'es4').length} files)
            </option>
          ))}
        </select>
      </div>

      {/* Explorer Action Toolbar */}
      <div className="bg-[#f0eed8] px-2 py-0.5 border-b border-[#d0ceb6] flex items-center justify-between text-[10px] text-gray-700">
        <span className="font-semibold text-gray-600">Files & Artifacts</span>
        <button
          onClick={onNewFile}
          title="Add New Source File (.es4)"
          className="flex items-center gap-1 text-blue-900 hover:text-blue-700 font-semibold"
        >
          <Plus className="w-3 h-3" />
          <span>New File</span>
        </button>
      </div>

      {/* Tree Content Area */}
      <div className="flex-1 overflow-auto p-1 font-mono text-[11px]">
        {/* Project Root Folder */}
        <div className="flex items-center gap-1 py-0.5 px-1 font-bold text-gray-800">
          <span className="text-[10px] text-gray-500">▼</span>
          <Briefcase className="w-3.5 h-3.5 text-blue-800" />
          <span className="truncate">{activeProject?.name || 'Current Project'}</span>
        </div>

        {/* Source Folder (src) */}
        <div className="pl-3">
          <div
            onClick={() => setIsSrcOpen(!isSrcOpen)}
            className="flex items-center gap-1 py-0.5 px-1 cursor-pointer hover:bg-[#ece9d8] text-gray-800 font-semibold"
          >
            <span className="text-[9px] text-gray-500">{isSrcOpen ? '▼' : '▶'}</span>
            {isSrcOpen ? (
              <FolderOpen className="w-3.5 h-3.5 text-amber-600 fill-amber-200" />
            ) : (
              <Folder className="w-3.5 h-3.5 text-amber-600 fill-amber-200" />
            )}
            <span>src ({srcFiles.length})</span>
          </div>

          {isSrcOpen && (
            <div className="pl-4">
              {srcFiles.map((file) => {
                const isSelected = file.id === activeFileId;
                return (
                  <div
                    key={file.id}
                    onClick={() => onSelectFile(file.id)}
                    className={`group flex items-center justify-between py-0.5 px-1 cursor-pointer select-none ${
                      isSelected
                        ? 'bg-[#0a246a] text-white'
                        : 'hover:bg-[#f0eed8] text-black'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <FileText className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-blue-700'}`} />
                      <span className="truncate">{file.name}</span>
                      {file.isModified && (
                        <span className={`text-[10px] ${isSelected ? 'text-yellow-300 font-bold' : 'text-red-600 font-bold'}`}>*</span>
                      )}
                    </div>
                    {srcFiles.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteFile(file.id);
                        }}
                        title="Delete file"
                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Build / Artifacts Folder (bin) */}
        <div className="pl-3 mt-1">
          <div
            onClick={() => setIsBinOpen(!isBinOpen)}
            className="flex items-center gap-1 py-0.5 px-1 cursor-pointer hover:bg-[#ece9d8] text-gray-800 font-semibold"
          >
            <span className="text-[9px] text-gray-500">{isBinOpen ? '▼' : '▶'}</span>
            {isBinOpen ? (
              <FolderOpen className="w-3.5 h-3.5 text-teal-600 fill-teal-100" />
            ) : (
              <Folder className="w-3.5 h-3.5 text-teal-600 fill-teal-100" />
            )}
            <span>bin ({binFiles.length})</span>
          </div>

          {isBinOpen && (
            <div className="pl-4">
              {binFiles.length === 0 ? (
                <div className="text-[10px] text-gray-400 italic px-1 py-0.5">
                  (No binaries compiled yet)
                </div>
              ) : (
                binFiles.map((file) => {
                  const isSelected = file.id === activeFileId;
                  return (
                    <div
                      key={file.id}
                      onClick={() => onSelectFile(file.id)}
                      className={`flex items-center justify-between py-0.5 px-1 cursor-pointer select-none ${
                        isSelected
                          ? 'bg-[#0a246a] text-white'
                          : 'hover:bg-[#f0eed8] text-black'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        {file.type === 'es4b' ? (
                          <Binary className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-teal-700'}`} />
                        ) : (
                          <FileCode className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-purple-700'}`} />
                        )}
                        <span className="truncate">{file.name}</span>
                      </div>
                      <span className="text-[9px] opacity-60">
                        {file.type === 'es4b' ? 'bin' : 'ir'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* New Project Modal Dialog */}
      {showNewProjDialog && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-[#d4d0c8] p-3 border-2 border-[#ffffff] border-r-[#404040] border-b-[#404040] shadow-2xl w-80 swing-bevel-raised">
            <div className="bg-[#0a246a] text-white font-bold px-2 py-1 flex justify-between items-center mb-3">
              <span>Create New Project</span>
              <button
                onClick={() => setShowNewProjDialog(false)}
                className="text-white hover:bg-red-600 px-1 text-xs"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateProjectSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-800 mb-1">
                  Project Name:
                </label>
                <input
                  type="text"
                  autoFocus
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  placeholder="e.g. My ES4 Application"
                  className="w-full bg-white border border-[#808080] px-2 py-1 text-xs focus:outline-none focus:border-blue-800"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#c0beb6]">
                <button
                  type="button"
                  onClick={() => setShowNewProjDialog(false)}
                  className="px-3 py-1 bg-[#d4d0c8] swing-bevel-raised hover:bg-[#ece9d8] active:swing-bevel-sunken text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newProjName.trim()}
                  className="px-3 py-1 bg-[#d4d0c8] swing-bevel-raised hover:bg-[#ece9d8] active:swing-bevel-sunken text-xs font-bold text-blue-900 disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
