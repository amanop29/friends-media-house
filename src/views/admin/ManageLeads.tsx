"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Phone, Calendar, Filter, MessageSquare, FileText, User, CheckCircle, Clock, XCircle, Search, ChevronDown, ChevronUp, Trash2, Edit } from 'lucide-react';
import { GlassCard } from '../../components/GlassCard';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { Lead } from '../../lib/mock-data';
import { getLeads, deleteLead, updateLeadStatus, updateLeadNotes } from '../../lib/leads-store';
import { formatEventType } from '../../lib/utils';
import { toast } from 'sonner';

export function ManageLeads() {
  const [searchQuery, setSearchQuery] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [expandedLead, setExpandedLead] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<{ [key: string]: string }>({});
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    const fetchLeads = async () => {
      const storedLeads = await getLeads();
      setLeads(storedLeads);
    };
    fetchLeads();
  }, []);

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone.includes(searchQuery) ||
      lead.message.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = async (leadId: string, newStatus: 'new' | 'contacted' | 'converted' | 'closed') => {
    await updateLeadStatus(leadId, newStatus);
    setLeads(leads.map(lead => {
      if (lead.id === leadId) {
        toast.success(`Lead status updated to ${newStatus}`);
        return { ...lead, status: newStatus };
      }
      return lead;
    }));
  };

  const handleSaveNotes = async (leadId: string) => {
    const notes = editingNotes[leadId];
    await updateLeadNotes(leadId, notes);
    setLeads(leads.map(lead => {
      if (lead.id === leadId) {
        toast.success('Notes saved successfully');
        return { ...lead, notes };
      }
      return lead;
    }));
    setEditingNotes({ ...editingNotes, [leadId]: '' });
  };

  const handleDelete = async (leadId: string, leadName: string) => {
    if (window.confirm(`Are you sure you want to delete the lead from "${leadName}"?`)) {
      await deleteLead(leadId);
      setLeads(leads.filter(l => l.id !== leadId));
      toast.success('Lead deleted successfully');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-500/20 border-blue-500/50 text-blue-500';
      case 'contacted':
        return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-500';
      case 'converted':
        return 'bg-green-500/20 border-green-500/50 text-green-500';
      case 'closed':
        return 'bg-gray-500/20 border-gray-500/50 text-gray-500';
      default:
        return 'bg-gray-500/20 border-gray-500/50 text-gray-500';
    }
  };

  const getEventTypeLabel = (type: string) => {
    return formatEventType(type);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const stats = {
    total: leads.length,
    new: leads.filter(l => l.status === 'new').length,
    contacted: leads.filter(l => l.status === 'contacted').length,
    converted: leads.filter(l => l.status === 'converted').length,
  };

  return (
    <div className="p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-[#2B2B2B] dark:text-white mb-6 md:mb-8" style={{ fontFamily: 'Playfair Display, serif' }}>
          Manage Leads
        </h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 md:mb-8">
          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#C5A572] to-[#8B7355] flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl text-[#2B2B2B] dark:text-white">{stats.total}</p>
                <p className="text-sm text-[#707070] dark:text-[#A0A0A0]">Total Leads</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#C5A572] to-[#8B7355] flex items-center justify-center flex-shrink-0">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl text-[#2B2B2B] dark:text-white">{stats.new}</p>
                <p className="text-sm text-[#707070] dark:text-[#A0A0A0]">New</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#C5A572] to-[#8B7355] flex items-center justify-center flex-shrink-0">
                <Phone className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl text-[#2B2B2B] dark:text-white">{stats.contacted}</p>
                <p className="text-sm text-[#707070] dark:text-[#A0A0A0]">Contacted</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#C5A572] to-[#8B7355] flex items-center justify-center flex-shrink-0">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl text-[#2B2B2B] dark:text-white">{stats.converted}</p>
                <p className="text-sm text-[#707070] dark:text-[#A0A0A0]">Converted</p>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Filters */}
        <div className="grid md:grid-cols-2 gap-4 mb-6 md:mb-8">
          {/* Search Bar */}
          <GlassCard className="p-4">
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/50 dark:bg-black/20 border border-black/20 dark:border-white/10 focus-within:border-[#C5A572] transition-colors">
              <Search className="w-5 h-5 text-[#707070] dark:text-[#A0A0A0] flex-shrink-0" />
              <Input
                type="text"
                placeholder="Search leads by name, email, phone, or message..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-[#1A1A1A] dark:text-white placeholder:text-[#707070] dark:placeholder:text-[#A0A0A0]"
              />
            </div>
          </GlassCard>

          {/* Status Filter */}
          <GlassCard className="p-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="rounded-lg bg-white/50 dark:bg-black/20 border-black/20 dark:border-white/10 focus:border-[#C5A572]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </GlassCard>
        </div>

        {/* Leads List */}
        <div className="space-y-4">
          {filteredLeads.map((lead, index) => {
            const isExpanded = expandedLead === lead.id;
            const currentNotes = editingNotes[lead.id] !== undefined ? editingNotes[lead.id] : (lead.notes || '');

            return (
              <motion.div
                key={lead.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <GlassCard className="overflow-hidden">
                  {/* Lead Header */}
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl text-[#2B2B2B] dark:text-white">
                            {lead.name}
                          </h3>
                          <span className={`px-3 py-1 rounded-full border text-xs capitalize ${getStatusColor(lead.status)}`}>
                            {lead.status}
                          </span>
                          <span className="px-3 py-1 rounded-full border border-[#C5A572]/50 bg-[#C5A572]/20 text-xs text-[#C5A572]">
                            {getEventTypeLabel(lead.eventType)}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-4 text-sm text-[#707070] dark:text-[#A0A0A0] mb-3">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            <a href={`mailto:${lead.email}`} className="hover:text-[#C5A572] transition-colors">
                              {lead.email}
                            </a>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            <a href={`tel:${lead.phone}`} className="hover:text-[#C5A572] transition-colors">
                              {lead.phone}
                            </a>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {formatDate(lead.submittedAt)}
                          </div>
                        </div>

                        <p className="text-[#2B2B2B] dark:text-white line-clamp-2">
                          {lead.message}
                        </p>
                      </div>

                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setExpandedLead(isExpanded ? null : lead.id)}
                          className="rounded-full hover:bg-white/10"
                          title="Expand/Collapse"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(lead.id, lead.name)}
                          className="rounded-full hover:bg-red-500/20 hover:text-red-500"
                          title="Delete Lead"
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="border-t border-black/20 dark:border-white/10 overflow-hidden"
                      >
                        <div className="p-6 space-y-6">
                          {/* Full Message */}
                          <div>
                            <h4 className="text-sm text-[#707070] dark:text-[#A0A0A0] mb-2">
                              Full Message
                            </h4>
                            <p className="text-[#2B2B2B] dark:text-white">
                              {lead.message}
                            </p>
                          </div>

                          {/* Status Update */}
                          <div>
                            <h4 className="text-sm text-[#707070] dark:text-[#A0A0A0] mb-2">
                              Update Status
                            </h4>
                            <Select
                              value={lead.status}
                              onValueChange={(value) => handleStatusChange(lead.id, value as any)}
                            >
                              <SelectTrigger className="rounded-lg bg-white/50 dark:bg-black/20 border-black/20 dark:border-white/10 focus:border-[#C5A572]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="new">New</SelectItem>
                                <SelectItem value="contacted">Contacted</SelectItem>
                                <SelectItem value="converted">Converted</SelectItem>
                                <SelectItem value="closed">Closed</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Notes */}
                          <div>
                            <h4 className="text-sm text-[#707070] dark:text-[#A0A0A0] mb-2">
                              Internal Notes
                            </h4>
                            <Textarea
                              value={currentNotes}
                              onChange={(e) => setEditingNotes({ ...editingNotes, [lead.id]: e.target.value })}
                              placeholder="Add notes about this lead..."
                              className="rounded-lg bg-white/50 dark:bg-black/20 border-black/20 dark:border-white/10 focus:border-[#C5A572] min-h-24"
                            />
                            {(editingNotes[lead.id] !== undefined && editingNotes[lead.id] !== (lead.notes || '')) && (
                              <Button
                                onClick={() => handleSaveNotes(lead.id)}
                                className="mt-3 bg-[#C5A572] hover:bg-[#B39563] text-white rounded-full px-6 gap-2"
                              >
                                <Edit className="w-4 h-4" />
                                Save Notes
                              </Button>
                            )}
                          </div>

                          {/* Quick Actions */}
                          <div>
                            <h4 className="text-sm text-[#707070] dark:text-[#A0A0A0] mb-3">
                              Quick Actions
                            </h4>
                            <div className="flex flex-wrap gap-3">
                              <Button
                                variant="outline"
                                className="rounded-full border-[#C5A572] text-[#C5A572] hover:bg-[#C5A572] hover:text-white gap-2"
                                onClick={() => window.location.href = `mailto:${lead.email}`}
                              >
                                <Mail className="w-4 h-4" />
                                Send Email
                              </Button>
                              <Button
                                variant="outline"
                                className="rounded-full border-[#C5A572] text-[#C5A572] hover:bg-[#C5A572] hover:text-white gap-2"
                                onClick={() => window.location.href = `tel:${lead.phone}`}
                              >
                                <Phone className="w-4 h-4" />
                                Call Now
                              </Button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>

        {filteredLeads.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[#707070] dark:text-[#A0A0A0]">
              No leads found matching your search.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}