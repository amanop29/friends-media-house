"use client";
import React, { useState, useEffect } from 'react';
import { motion } from "framer-motion";
import { Plus, Edit2, Trash2, Save, X, HelpCircle } from 'lucide-react';
import { GlassCard } from '../../components/GlassCard';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { FAQ } from '../../lib/mock-data';
import { getFAQs, saveFAQs, addFAQ, updateFAQ, deleteFAQ } from '../../lib/faqs-store';
import { toast } from 'sonner';
import { cn } from '../../components/ui/utils';

export function ManageFAQs() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  
  const [formData, setFormData] = useState<Partial<FAQ>>({
    question: '',
    answer: '',
    category: 'general',
  });

  useEffect(() => {
    loadFAQs();

    // Listen for FAQs updates
    const handleFAQsUpdate = () => {
      loadFAQs();
    };

    window.addEventListener('faqsUpdated', handleFAQsUpdate as EventListener);
    
    return () => {
      window.removeEventListener('faqsUpdated', handleFAQsUpdate as EventListener);
    };
  }, []);

  const loadFAQs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/faqs');
      if (response.ok) {
        const data = await response.json();
        setFaqs(data.faqs || data);
      } else {
        // Fallback to localStorage
        setFaqs(getFAQs());
      }
    } catch (error) {
      console.error('Failed to load FAQs:', error);
      setFaqs(getFAQs());
    } finally {
      setIsLoading(false);
    }
  };

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'booking', label: 'Booking' },
    { value: 'pricing', label: 'Pricing' },
    { value: 'delivery', label: 'Delivery' },
    { value: 'general', label: 'General' },
  ];

  const filteredFaqs = filterCategory === 'all' 
    ? faqs 
    : faqs.filter(faq => faq.category === filterCategory);

  const handleAdd = async () => {
    if (!formData.question || !formData.answer || !formData.category) {
      toast.error('Please fill in all fields');
      return;
    }

    const newFAQ = {
      id: `faq-${Date.now()}`,
      question: formData.question,
      answer: formData.answer,
      category: formData.category,
      order: faqs.length + 1,
    };

    try {
      // Try to add via API first
      const response = await fetch('/api/faqs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFAQ),
      });

      if (!response.ok) {
        // Fallback to store function
        await addFAQ(newFAQ as FAQ);
      }

      await loadFAQs();
      setFormData({ question: '', answer: '', category: 'general' });
      setShowAddForm(false);
      toast.success('FAQ added successfully');
    } catch (error) {
      toast.error('Failed to add FAQ');
      console.error(error);
    }
  };

  const handleEdit = (faq: FAQ) => {
    setEditingId(faq.id);
    setFormData({
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
    });
  };

  const handleUpdate = async () => {
    if (!formData.question || !formData.answer || !formData.category || !editingId) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      await updateFAQ(editingId, {
        question: formData.question!,
        answer: formData.answer!,
        category: formData.category as FAQ['category'],
      });

      await loadFAQs();
      setEditingId(null);
      setFormData({ question: '', answer: '', category: 'general' });
      toast.success('FAQ updated successfully');
    } catch (error) {
      toast.error('Failed to update FAQ');
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this FAQ?')) {
      try {
        // Try to delete via API first
        const response = await fetch(`/api/faqs?id=${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          // Fallback to store function
          await deleteFAQ(id);
        }

        await loadFAQs();
        toast.success('FAQ deleted successfully');
      } catch (error) {
        toast.error('Failed to delete FAQ');
        console.error(error);
      }
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setShowAddForm(false);
    setFormData({ question: '', answer: '', category: 'general' });
  };

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl text-[#2B2B2B] dark:text-white mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
            Manage FAQs
          </h1>
          <p className="text-sm md:text-base text-[#707070] dark:text-[#A0A0A0]">
            Add, edit, or remove frequently asked questions
          </p>
        </div>
        <Button
          onClick={() => setShowAddForm(true)}
          disabled={showAddForm || editingId !== null}
          className="!bg-[#C5A572] hover:!bg-[#B39563] !text-white rounded-full gap-2 w-full md:w-auto"
        >
          <Plus className="w-4 h-4" />
          Add FAQ
        </Button>
      </div>

      {/* Category Filter */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6"
      >
        <GlassCard className="p-4">
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <Button
                key={cat.value}
                onClick={() => setFilterCategory(cat.value)}
                variant={filterCategory === cat.value ? 'default' : 'outline'}
                size="sm"
                className={
                  filterCategory === cat.value
                    ? '!bg-[#C5A572] hover:!bg-[#B39563] !text-white rounded-full'
                    : 'rounded-full border-[#C5A572] text-[#C5A572] hover:bg-[#C5A572] hover:text-white'
                }
              >
                {cat.label}
              </Button>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      {/* Add Form */}
      {showAddForm && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6"
        >
          <GlassCard className="p-6">
            <h2 className="text-[#2B2B2B] dark:text-white mb-4 flex items-center gap-3">
              <Plus className="w-5 h-5 text-[#C5A572]" />
              Add New FAQ
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[#2B2B2B] dark:text-white mb-2">
                  Category
                </label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value as FAQ['category'] })}
                >
                  <SelectTrigger className="rounded-lg bg-white/50 dark:bg-black/20 border-black/20 dark:border-white/10 focus:border-[#C5A572]">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.filter(c => c.value !== 'all').map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-[#2B2B2B] dark:text-white mb-2">
                  Question
                </label>
                <Input
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  className="rounded-lg bg-white/50 dark:bg-black/20 border-black/20 dark:border-white/10 focus:border-[#C5A572]"
                  placeholder="Enter the question..."
                />
              </div>

              <div>
                <label className="block text-[#2B2B2B] dark:text-white mb-2">
                  Answer
                </label>
                <Textarea
                  value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                  className="rounded-lg bg-white/50 dark:bg-black/20 border-black/20 dark:border-white/10 focus:border-[#C5A572] min-h-32"
                  placeholder="Enter the answer..."
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleAdd}
                  className="!bg-[#C5A572] hover:!bg-[#B39563] !text-white rounded-full gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save FAQ
                </Button>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  className="rounded-full"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </Button>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#C5A572]"></div>
          <p className="text-[#707070] dark:text-[#A0A0A0] mt-4">Loading FAQs...</p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#C5A572] to-[#8B7355] flex items-center justify-center">
              <HelpCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-[#707070] dark:text-[#A0A0A0] text-sm">Total FAQs</p>
              <p className="text-[#2B2B2B] dark:text-white text-2xl">{faqs.length}</p>
            </div>
          </div>
        </GlassCard>

        {categories.filter(c => c.value !== 'all').map((cat, index) => {
          const count = faqs.filter(f => f.category === cat.value).length;
          
          return (
            <GlassCard key={cat.value} className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#C5A572] to-[#8B7355] flex items-center justify-center">
                  <span className="text-white text-lg">{count}</span>
                </div>
                <div>
                  <p className="text-[#707070] dark:text-[#A0A0A0] text-sm">{cat.label}</p>
                  <p className="text-[#2B2B2B] dark:text-white">{count} FAQ{count !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </GlassCard>
          );
        })}
          </div>

          {/* FAQ List */}
          <div className="space-y-4">
            {filteredFaqs.length === 0 ? (
              <GlassCard className="p-12 text-center">
                <HelpCircle className="w-12 h-12 text-[#C5A572] mx-auto mb-4" />
                <p className="text-[#707070] dark:text-[#A0A0A0]">
                  {filterCategory === 'all' ? 'No FAQs yet. Add your first one!' : `No FAQs in the ${categories.find(c => c.value === filterCategory)?.label} category`}
                </p>
              </GlassCard>
            ) : (
              filteredFaqs.map((faq, index) => (
                <motion.div
                  key={faq.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                <GlassCard className="p-4 md:p-6">
                  {editingId === faq.id ? (
                    // Edit Mode
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[#2B2B2B] dark:text-white mb-2">
                          Category
                        </label>
                        <Select
                          value={formData.category}
                          onValueChange={(value) => setFormData({ ...formData, category: value as FAQ['category'] })}
                        >
                          <SelectTrigger className="rounded-lg bg-white/50 dark:bg-black/20 border-black/20 dark:border-white/10 focus:border-[#C5A572]">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.filter(c => c.value !== 'all').map((cat) => (
                              <SelectItem key={cat.value} value={cat.value}>
                                {cat.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="block text-[#2B2B2B] dark:text-white mb-2">
                          Question
                        </label>
                        <Input
                          value={formData.question}
                          onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                          className="rounded-lg bg-white/50 dark:bg-black/20 border-black/20 dark:border-white/10 focus:border-[#C5A572]"
                        />
                      </div>

                      <div>
                        <label className="block text-[#2B2B2B] dark:text-white mb-2">
                          Answer
                        </label>
                        <Textarea
                          value={formData.answer}
                          onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                          className="rounded-lg bg-white/50 dark:bg-black/20 border-black/20 dark:border-white/10 focus:border-[#C5A572] min-h-32"
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={handleUpdate}
                          className="!bg-[#C5A572] hover:!bg-[#B39563] !text-white rounded-full gap-2"
                        >
                          <Save className="w-4 h-4" />
                          Save Changes
                        </Button>
                        <Button
                          onClick={handleCancel}
                          variant="outline"
                          className="rounded-full"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div>
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <h3 className="text-[#2B2B2B] dark:text-white mb-2">
                            {faq.question}
                          </h3>
                          <span className="inline-block px-3 py-1 rounded-full text-xs bg-[#C5A572]/10 text-[#C5A572] capitalize">
                            {faq.category}
                          </span>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button
                            onClick={() => handleEdit(faq)}
                            disabled={editingId !== null || showAddForm}
                            variant="outline"
                            size="icon"
                            className="rounded-full border-[#C5A572] text-[#C5A572] hover:bg-[#C5A572] hover:text-white"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => handleDelete(faq.id)}
                            disabled={editingId !== null || showAddForm}
                            variant="outline"
                            size="icon"
                            className="rounded-full border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-[#707070] dark:text-[#A0A0A0]">
                        {faq.answer}
                      </p>
                    </div>
                  )}
                </GlassCard>
              </motion.div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
