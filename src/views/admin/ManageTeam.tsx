"use client";
import React, { useEffect, useState } from 'react';
import { motion } from "framer-motion";
import { Upload, Save, X, Edit2, Trash2, Users, RefreshCw, ChevronUp, ChevronDown } from 'lucide-react';
import { GlassCard } from '../../components/GlassCard';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { cn } from '../../components/ui/utils';
import { toast } from 'sonner';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { TeamMember } from '../../lib/mock-data';
import { compressAndUploadImage } from '../../lib/upload-helper';
import { createTeamMember, deleteTeamMember, getTeamMembers, updateTeamMember } from '../../lib/team-store';

const emptyForm: Partial<TeamMember> = {
  name: '',
  role: '',
  specialty: '',
  bio: '',
  order: 0,
};

export function ManageTeam() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [formData, setFormData] = useState<Partial<TeamMember>>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadTeam();

    const handleUpdate = (event: Event) => {
      const detail = (event as CustomEvent).detail as TeamMember[] | undefined;
      if (detail) setTeam(detail);
    };

    window.addEventListener('teamUpdated', handleUpdate as EventListener);
    return () => window.removeEventListener('teamUpdated', handleUpdate as EventListener);
  }, []);

  const loadTeam = async () => {
    setIsLoading(true);
    const members = await getTeamMembers();
    setTeam(members);
    setIsLoading(false);
    // Default order to append after existing items
    setFormData((prev) => ({ ...prev, order: members.length + 1 }));
  };

  const resetForm = () => {
    setFormData({ ...emptyForm, order: team.length + 1 });
    setEditingId(null);
  };

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    const toastId = toast.loading('Uploading photo...');
    console.log('Starting team photo upload:', file.name, file.type, file.size);
    try {
      const result = await compressAndUploadImage(file, 'team', 2);
      console.log('Upload result:', result);
      if (!result.success || !result.url) {
        const errorMsg = result.error || 'Upload failed';
        console.error('Upload failed:', errorMsg);
        toast.error(errorMsg, { id: toastId });
        return;
      }
      console.log('Photo uploaded successfully:', result.url);
      setFormData((prev) => ({
        ...prev,
        photoUrl: result.url,
        photoThumbnailUrl: result.thumbnailUrl,
      }));
      toast.success('Photo uploaded', { id: toastId });
    } catch (error) {
      console.error('Photo upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload photo', { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.role) {
      toast.error('Name and role are required');
      return;
    }
    if (!formData.photoUrl) {
      toast.error('Please upload a photo');
      return;
    }

    setIsSaving(true);
    const payload = {
      ...formData,
      order: Number(formData.order) || 0,
    } as Partial<TeamMember>;

    console.log('Submitting team member:', payload);

    try {
      if (editingId) {
        console.log('Updating team member:', editingId);
        const success = await updateTeamMember(editingId, payload);
        console.log('Update result:', success);
        if (success) {
          toast.success('Team member updated');
        } else {
          throw new Error('Update failed');
        }
      } else {
        console.log('Creating new team member');
        const result = await createTeamMember({ ...payload });
        console.log('Create result:', result);
        if (result) {
          toast.success('Team member added');
        } else {
          throw new Error('Create failed');
        }
      }
      await loadTeam();
      resetForm();
    } catch (error) {
      console.error('Save team member failed:', error);
      toast.error(error instanceof Error ? error.message : 'Could not save team member');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (member: TeamMember) => {
    setEditingId(member.id);
    setFormData({
      id: member.id,
      name: member.name,
      role: member.role,
      specialty: member.specialty,
      bio: member.bio,
      order: member.order ?? 0,
      photoUrl: member.photoUrl,
      photoThumbnailUrl: member.photoThumbnailUrl,
      photoKey: member.photoKey,
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this team member?')) return;
    try {
      await deleteTeamMember(id);
      toast.success('Team member deleted');
      await loadTeam();
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('Could not delete team member');
    }
  };

  const handleMoveUp = async (memberId: string) => {
    const sorted = team.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const currentIndex = sorted.findIndex((m) => m.id === memberId);
    if (currentIndex <= 0) {
      toast.error('Already at the top');
      return;
    }

    const current = sorted[currentIndex];
    const previous = sorted[currentIndex - 1];
    const currentOrder = current.order ?? 0;
    const previousOrder = previous.order ?? 0;

    try {
      // Swap orders
      await updateTeamMember(current.id, { ...current, order: previousOrder });
      await updateTeamMember(previous.id, { ...previous, order: currentOrder });
      toast.success('Order updated');
      await loadTeam();
    } catch (error) {
      console.error('Move up failed:', error);
      toast.error('Could not update order');
    }
  };

  const handleMoveDown = async (memberId: string) => {
    const sorted = team.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const currentIndex = sorted.findIndex((m) => m.id === memberId);
    if (currentIndex >= sorted.length - 1) {
      toast.error('Already at the bottom');
      return;
    }

    const current = sorted[currentIndex];
    const next = sorted[currentIndex + 1];
    const currentOrder = current.order ?? 0;
    const nextOrder = next.order ?? 0;

    try {
      // Swap orders
      await updateTeamMember(current.id, { ...current, order: nextOrder });
      await updateTeamMember(next.id, { ...next, order: currentOrder });
      toast.success('Order updated');
      await loadTeam();
    } catch (error) {
      console.error('Move down failed:', error);
      toast.error('Could not update order');
    }
  };

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl text-[#2B2B2B] dark:text-white mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
            Manage Team
          </h1>
          <p className="text-sm md:text-base text-[#707070] dark:text-[#A0A0A0]">
            Add, edit, or remove team members shown on the About page
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => loadTeam()}
            variant="outline"
            className="rounded-full"
            disabled={isLoading}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={resetForm}
            variant="outline"
            className="rounded-full"
          >
            <X className="w-4 h-4 mr-2" />
            Clear Form
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#C5A572] to-[#8B7355] flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-[#707070] dark:text-[#A0A0A0] text-sm">Total Members</p>
              <p className="text-[#2B2B2B] dark:text-white text-2xl">{team.length}</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="mb-6"
      >
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl text-[#2B2B2B] dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-[#C5A572]" />
              {editingId ? 'Edit Team Member' : 'Add Team Member'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label className="block text-[#2B2B2B] dark:text-white mb-2">Name</Label>
                <Input
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter full name"
                  className="rounded-lg bg-white/50 dark:bg-black/20 border-black/20 dark:border-white/10 focus:border-[#C5A572]"
                />
              </div>

              <div>
                <Label className="block text-[#2B2B2B] dark:text-white mb-2">Role</Label>
                <Input
                  value={formData.role || ''}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  placeholder="Lead Photographer"
                  className="rounded-lg bg-white/50 dark:bg-black/20 border-black/20 dark:border-white/10 focus:border-[#C5A572]"
                />
              </div>

              <div>
                <Label className="block text-[#2B2B2B] dark:text-white mb-2">Specialty</Label>
                <Input
                  value={formData.specialty || ''}
                  onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                  placeholder="Weddings, Cinematic Films"
                  className="rounded-lg bg-white/50 dark:bg-black/20 border-black/20 dark:border-white/10 focus:border-[#C5A572]"
                />
              </div>

              <div>
                <Label className="block text-[#2B2B2B] dark:text-white mb-2">Short Bio</Label>
                <Textarea
                  value={formData.bio || ''}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="A few lines about this team member"
                  className="rounded-lg bg-white/50 dark:bg-black/20 border-black/20 dark:border-white/10 focus:border-[#C5A572] min-h-28"
                />
              </div>

              <div>
                <Label className="block text-[#2B2B2B] dark:text-white mb-2">Display Order</Label>
                <Input
                  type="number"
                  value={formData.order ?? 0}
                  onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })}
                  className="rounded-lg bg-white/50 dark:bg-black/20 border-black/20 dark:border-white/10 focus:border-[#C5A572]"
                />
              </div>
            </div>

            <div className="space-y-4">
              <Label className="block text-[#2B2B2B] dark:text-white">Photo</Label>
              <div className="flex flex-col gap-4 items-start">
                <div className="w-full max-w-[240px]">
                  <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 border-2 border-dashed border-[#C5A572] flex items-center justify-center">
                    {formData.photoUrl ? (
                      <img
                        src={formData.photoUrl}
                        alt={formData.name || 'Team member photo'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.error('Image failed to load:', formData.photoUrl);
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="text-center text-[#707070] dark:text-[#A0A0A0] text-sm px-3">
                        Upload portrait photo
                      </div>
                    )}
                  </div>
                </div>
                <div className="w-full space-y-3">
                  <p className="text-sm text-[#707070] dark:text-[#A0A0A0]">
                    Use a clear portrait (min 600x800). Images are optimized and stored in R2.
                  </p>
                  <label className={cn(
                    'inline-flex items-center gap-2 px-4 py-2 rounded-full cursor-pointer border border-[#C5A572] text-[#C5A572] hover:bg-[#C5A572] hover:text-white transition-colors',
                    isUploading && 'opacity-70 cursor-not-allowed'
                  )}>
                    <Upload className="w-4 h-4" />
                    <span>{isUploading ? 'Uploading...' : 'Upload Photo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={isUploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload(file);
                      }}
                    />
                  </label>
                  {formData.photoUrl && (
                    <p className="text-xs text-[#707070] dark:text-[#A0A0A0] break-all">
                      {formData.photoUrl}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleSubmit}
                  className="!bg-[#C5A572] hover:!bg-[#B39563] !text-white rounded-full gap-2"
                  disabled={isSaving || isUploading}
                >
                  <Save className="w-4 h-4" />
                  {editingId ? 'Update Member' : 'Save Member'}
                </Button>
                {editingId && (
                  <Button
                    onClick={resetForm}
                    variant="ghost"
                    className="rounded-full"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Team List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#C5A572]"></div>
          <p className="text-[#707070] dark:text-[#A0A0A0] mt-4">Loading team members...</p>
        </div>
      ) : team.length === 0 ? (
        <GlassCard className="p-8 text-center text-[#707070] dark:text-[#A0A0A0]">
          No team members yet. Add your first member above.
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {team
            .slice()
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .map((member) => (
              <GlassCard key={member.id} className="p-4 flex gap-4 items-start">
                <div className="w-24 h-32 rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 flex-shrink-0">
                  <ImageWithFallback
                    src={member.photoUrl}
                    alt={member.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <div>
                    <p className="text-lg text-[#2B2B2B] dark:text-white">{member.name}</p>
                    <p className="text-sm text-[#C5A572]">{member.role}</p>
                  </div>
                  {member.specialty && (
                    <p className="text-sm text-[#707070] dark:text-[#A0A0A0]">{member.specialty}</p>
                  )}
                  {member.bio && (
                    <p className="text-sm text-[#707070] dark:text-[#A0A0A0] line-clamp-3">{member.bio}</p>
                  )}
                  <div className="flex gap-2 pt-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => handleMoveUp(member.id)}
                      title="Move up in display order"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => handleMoveDown(member.id)}
                      title="Move down in display order"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => handleEdit(member)}
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-full text-red-500 hover:text-red-600 hover:bg-red-500/10"
                      onClick={() => handleDelete(member.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </GlassCard>
            ))}
        </div>
      )}
    </div>
  );
}
