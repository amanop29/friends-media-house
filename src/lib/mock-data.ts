// Mock data for Friends Media House

export interface Photo {
  id: string;
  url: string;
  thumbnail: string;
  eventId: string;
  supabaseEventId?: string; // Supabase UUID for the event (for syncing to photos table)
  supabasePhotoId?: string; // Supabase UUID for this photo (returned after insert)
  uploadedAt: string;
  orientation?: 'portrait' | 'landscape' | 'square';
  width?: number;
  height?: number;
  likeCount?: number; // total number of likes from all users
  fileSize?: number; // File size in bytes
  mimeType?: string; // MIME type (e.g., 'image/jpeg')
}

export interface PhotoComment {
  id: string;
  photoId: string;
  guestName: string;
  guestEmail: string;
  comment: string;
  createdAt: string;
  avatar?: string;
  hidden: boolean;
}

export interface PhotoTag {
  id: string;
  photoId: string;
  personId?: string; // optional, could be a guest
  guestName?: string; // if not a recognized person
  submittedBy: string;
  approved: boolean;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: 'booking' | 'pricing' | 'delivery' | 'general';
  order: number;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  eventType: string;
  message: string;
  date?: string;
  submittedAt: string;
  createdAt?: string;
  status: 'new' | 'contacted' | 'converted' | 'closed';
  priority?: 'low' | 'medium' | 'high';
  source?: string;
  notes?: string;
}

export interface Event {
  id: string;
  title: string;
  coupleNames: string;
  date: string;
  location: string;
  category: string;
  description?: string; // Event description
  coverImage: string;
  coverThumbnail?: string; // Thumbnail URL for cover image
  supabaseId?: string; // Supabase row id for sync
  photoCount: number;
  videoCount?: number; // Number of videos
  viewCount?: number; // View count from Supabase
  videoUrl?: string; // Legacy field - kept for backwards compatibility
  videos?: Video[]; // New field for multiple videos
  isVisible?: boolean; // Controls if gallery is visible on website
  isFeatured?: boolean; // Controls if event is featured on homepage
  slug?: string; // URL-friendly slug for the event
}

export interface Video {
  id: string;
  url: string; // YouTube URL or uploaded video URL
  thumbnail: string; // Auto-fetched from YouTube or custom
  title?: string;
  type: 'youtube' | 'upload'; // Type of video
  uploadedAt: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  specialty?: string;
  bio?: string;
  photoUrl: string;
  photoThumbnailUrl?: string;
  photoKey?: string;
  order?: number;
  isActive?: boolean;
  createdAt?: string;
}

export interface Review {
  id: string;
  name: string;
  email?: string;
  avatar: string;
  rating: number;
  text: string;
  date: string;
  eventName: string;
  hidden: boolean;
}

export interface EventCategory {
  id: string;
  label: string;
}

// Default avatar options for users to choose from - icon-based with gradients
export interface AvatarOption {
  id: string;
  gradient: string;
  icon: string; // Icon name from lucide-react
}

export const defaultAvatars: AvatarOption[] = [
  { id: 'avatar-1', gradient: 'from-[#C5A572] to-[#8B7355]', icon: 'User' },
  { id: 'avatar-2', gradient: 'from-[#C5A572] to-[#8B7355]', icon: 'Heart' },
  { id: 'avatar-3', gradient: 'from-[#C5A572] to-[#8B7355]', icon: 'Smile' },
  { id: 'avatar-4', gradient: 'from-[#C5A572] to-[#8B7355]', icon: 'Star' },
  { id: 'avatar-5', gradient: 'from-[#C5A572] to-[#8B7355]', icon: 'Camera' },
  { id: 'avatar-6', gradient: 'from-[#C5A572] to-[#8B7355]', icon: 'Music' },
  { id: 'avatar-7', gradient: 'from-[#C5A572] to-[#8B7355]', icon: 'Flower2' },
];

// Event Categories - centralized and dynamic
export let eventCategories: EventCategory[] = [
  { id: 'wedding', label: 'Wedding' },
  { id: 'pre-wedding', label: 'Pre-Wedding' },
  { id: 'event', label: 'Event' },
  { id: 'film', label: 'Cinematic Film' },
];

// Mock team members used as fallback when Supabase is unavailable
export const mockTeamMembers: TeamMember[] = [
  {
    id: 'team-1',
    name: 'Rajesh Kumar',
    role: 'Lead Photographer',
    specialty: 'Wedding Photography',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    order: 1,
    isActive: true,
  },
  {
    id: 'team-2',
    name: 'Priya Sharma',
    role: 'Cinematographer',
    specialty: 'Cinematic Films',
    photoUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
    order: 2,
    isActive: true,
  },
  {
    id: 'team-3',
    name: 'Amit Patel',
    role: 'Senior Photographer',
    specialty: 'Pre-Wedding Shoots',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
    order: 3,
    isActive: true,
  },
  {
    id: 'team-4',
    name: 'Sneha Reddy',
    role: 'Creative Director',
    specialty: 'Event Coverage',
    photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
    order: 4,
    isActive: true,
  },
];

// Function to add a new category
export const addEventCategory = (label: string): EventCategory => {
  const id = label.toLowerCase().replace(/\s+/g, '-');
  const newCategory = { id, label };
  eventCategories = [...eventCategories, newCategory];
  return newCategory;
};

// Function to get all categories
export const getEventCategories = (): EventCategory[] => {
  return eventCategories;
};

// Mock events
export const mockEvents: Event[] = [
  {
    id: '1',
    title: 'Priya & Rahul Wedding',
    slug: 'priya-rahul-wedding',
    coupleNames: 'Priya Sharma & Rahul Verma',
    date: '2024-12-15',
    location: 'The Grand Palace, Mumbai',
    category: 'wedding',
    coverImage: 'https://images.unsplash.com/photo-1716813344739-51ac117d5ecc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080',
    photoCount: 248,
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    isVisible: true,
  },
  {
    id: '2',
    title: 'Anjali & Arjun Pre-Wedding',
    slug: 'anjali-arjun-pre-wedding',
    coupleNames: 'Anjali Patel & Arjun Singh',
    date: '2024-11-20',
    location: 'Goa Beach Resort',
    category: 'pre-wedding',
    coverImage: 'https://images.unsplash.com/photo-1733280225971-931fb692db99?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080',
    photoCount: 156,
    isVisible: true,
  },
  {
    id: '3',
    title: 'Meera & Vikram Reception',
    slug: 'meera-vikram-reception',
    coupleNames: 'Meera Reddy & Vikram Khanna',
    date: '2024-10-08',
    location: 'Taj Palace, Delhi',
    category: 'event',
    coverImage: 'https://images.unsplash.com/photo-1549620936-aa6278062ba5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080',
    photoCount: 312,
    isVisible: true,
  },
  {
    id: '4',
    title: 'Sharma Family Celebration',
    slug: 'sharma-family-celebration',
    coupleNames: 'Sharma Family',
    date: '2024-09-22',
    location: 'ITC Grand, Bangalore',
    category: 'event',
    coverImage: 'https://images.unsplash.com/photo-1600879227354-f2809c06f145?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080',
    photoCount: 189,
    isVisible: false,
  },
  {
    id: '5',
    title: 'Destination Wedding Film',
    slug: 'destination-wedding-film',
    coupleNames: 'Neha & Karthik',
    date: '2024-08-15',
    location: 'Udaipur, Rajasthan',
    category: 'film',
    coverImage: 'https://images.unsplash.com/photo-1664530140722-7e3bdbf2b870?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080',
    photoCount: 425,
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    isVisible: true,
  },
  {
    id: '6',
    title: 'Traditional Wedding Ceremony',
    slug: 'traditional-wedding-ceremony',
    coupleNames: 'Divya & Rohan',
    date: '2024-07-30',
    location: 'Chennai',
    category: 'wedding',
    coverImage: 'https://images.unsplash.com/photo-1672289444692-2bd3b48c5178?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080',
    photoCount: 298,
    isVisible: true,
  },
];

// Mock photos with face tags
export const mockPhotos: Photo[] = [
  { id: 'p1', url: 'https://images.unsplash.com/photo-1716813344739-51ac117d5ecc?w=800', thumbnail: 'https://images.unsplash.com/photo-1716813344739-51ac117d5ecc?w=400', eventId: '1', uploadedAt: '2024-12-16', orientation: 'landscape', width: 1200, height: 800, likeCount: 24 },
  { id: 'p2', url: 'https://images.unsplash.com/photo-1610173826014-d131b02d69ca?w=800', thumbnail: 'https://images.unsplash.com/photo-1610173826014-d131b02d69ca?w=400', eventId: '1', uploadedAt: '2024-12-16', orientation: 'portrait', width: 800, height: 1200, likeCount: 18 },
  { id: 'p3', url: 'https://images.unsplash.com/photo-1626619485175-904897294d80?w=800', thumbnail: 'https://images.unsplash.com/photo-1626619485175-904897294d80?w=400', eventId: '1', uploadedAt: '2024-12-16', orientation: 'landscape', width: 1200, height: 800, likeCount: 32 },
  { id: 'p4', url: 'https://images.unsplash.com/photo-1549620936-aa6278062ba5?w=800', thumbnail: 'https://images.unsplash.com/photo-1549620936-aa6278062ba5?w=400', eventId: '1', uploadedAt: '2024-12-16', orientation: 'landscape', width: 1200, height: 800, likeCount: 45 },
  { id: 'p5', url: 'https://images.unsplash.com/photo-1672289444692-2bd3b48c5178?w=800', thumbnail: 'https://images.unsplash.com/photo-1672289444692-2bd3b48c5178?w=400', eventId: '1', uploadedAt: '2024-12-16', orientation: 'portrait', width: 800, height: 1200, likeCount: 12 },
  { id: 'p6', url: 'https://images.unsplash.com/photo-1664530140722-7e3bdbf2b870?w=800', thumbnail: 'https://images.unsplash.com/photo-1664530140722-7e3bdbf2b870?w=400', eventId: '1', uploadedAt: '2024-12-16', orientation: 'square', width: 1000, height: 1000, likeCount: 8 },
  { id: 'p7', url: 'https://images.unsplash.com/photo-1600879227354-f2809c06f145?w=800', thumbnail: 'https://images.unsplash.com/photo-1600879227354-f2809c06f145?w=400', eventId: '1', uploadedAt: '2024-12-16', orientation: 'landscape', width: 1200, height: 800, likeCount: 27 },
  { id: 'p8', url: 'https://images.unsplash.com/photo-1733280225971-931fb692db99?w=800', thumbnail: 'https://images.unsplash.com/photo-1733280225971-931fb692db99?w=400', eventId: '1', uploadedAt: '2024-12-16', orientation: 'portrait', width: 800, height: 1200, likeCount: 35 },
  { id: 'p9', url: 'https://images.unsplash.com/photo-1716813344739-51ac117d5ecc?w=800', thumbnail: 'https://images.unsplash.com/photo-1716813344739-51ac117d5ecc?w=400', eventId: '2', uploadedAt: '2024-11-21', orientation: 'landscape', width: 1200, height: 800, likeCount: 19 },
  { id: 'p10', url: 'https://images.unsplash.com/photo-1733280225971-931fb692db99?w=800', thumbnail: 'https://images.unsplash.com/photo-1733280225971-931fb692db99?w=400', eventId: '2', uploadedAt: '2024-11-21', orientation: 'portrait', width: 800, height: 1200, likeCount: 22 },
  { id: 'p11', url: 'https://images.unsplash.com/photo-1626619485175-904897294d80?w=800', thumbnail: 'https://images.unsplash.com/photo-1626619485175-904897294d80?w=400', eventId: '2', uploadedAt: '2024-11-21', orientation: 'landscape', width: 1200, height: 800, likeCount: 16 },
  { id: 'p12', url: 'https://images.unsplash.com/photo-1610173826014-d131b02d69ca?w=800', thumbnail: 'https://images.unsplash.com/photo-1610173826014-d131b02d69ca?w=400', eventId: '2', uploadedAt: '2024-11-21', orientation: 'portrait', width: 800, height: 1200, likeCount: 14 },
];

// Mock reviews
export const mockReviews: Review[] = [
  {
    id: 'r1',
    name: 'Priya Sharma',
    avatar: 'https://images.unsplash.com/photo-1610173826014-d131b02d69ca?w=100',
    rating: 5,
    text: 'Friends Media House captured our wedding beautifully! Every moment was perfect, and the team was so professional. Their attention to detail and creative vision exceeded all our expectations!',
    date: '2024-12-20',
    eventName: 'Priya & Rahul Wedding',
    hidden: false,
  },
  {
    id: 'r2',
    name: 'Anjali Patel',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
    rating: 5,
    text: 'Absolutely stunning pre-wedding shoot! The team made us feel so comfortable, and the photos turned out magical. Highly recommend!',
    date: '2024-11-25',
    eventName: 'Anjali & Arjun Pre-Wedding',
    hidden: false,
  },
  {
    id: 'r3',
    name: 'Meera Reddy',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100',
    rating: 5,
    text: 'The reception coverage was phenomenal. Every detail was captured with such artistry. The cinematic video brought tears to our eyes!',
    date: '2024-10-15',
    eventName: 'Meera & Vikram Reception',
    hidden: false,
  },
  {
    id: 'r4',
    name: 'Neha Kapoor',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
    rating: 5,
    text: 'Best decision we made for our destination wedding! The team traveled with us and documented everything perfectly.',
    date: '2024-08-20',
    eventName: 'Destination Wedding Film',
    hidden: false,
  },
  {
    id: 'r5',
    name: 'Rahul Verma',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
    rating: 5,
    text: 'Professional, creative, and friendly. The entire experience was seamless from start to finish.',
    date: '2024-12-21',
    eventName: 'Priya & Rahul Wedding',
    hidden: false,
  },
  {
    id: 'r6',
    name: 'Divya Kumar',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100',
    rating: 5,
    text: 'The traditional ceremony was captured with such respect and beauty. We will cherish these memories forever!',
    date: '2024-08-05',
    eventName: 'Traditional Wedding Ceremony',
    hidden: false,
  },
];

// Mock photo comments - empty by default (comments should come from Supabase)
export const mockPhotoComments: PhotoComment[] = [];

// Mock photo tags submitted by guests
export const mockPhotoTags: PhotoTag[] = [
  {
    id: 't1',
    photoId: 'p4',
    guestName: 'Uncle Rajesh',
    submittedBy: 'guest@example.com',
    approved: false,
  },
  {
    id: 't2',
    photoId: 'p6',
    personId: '5',
    submittedBy: 'meera@example.com',
    approved: true,
  },
];

// Mock FAQ data
export const mockFAQs: FAQ[] = [
  {
    id: 'faq1',
    question: 'How do I book your services?',
    answer: 'You can book our services by filling out the contact form on our website, calling us directly, or sending us an email. We\'ll schedule a consultation to discuss your event details, preferences, and package options.',
    category: 'booking',
    order: 1,
  },
  {
    id: 'faq2',
    question: 'What is included in your wedding packages?',
    answer: 'Our packages typically include pre-wedding shoots, full-day wedding coverage, professionally edited photos, cinematic videos, and delivery through our secure online platform. Custom packages are available to suit your specific needs.',
    category: 'pricing',
    order: 2,
  },
  {
    id: 'faq3',
    question: 'How long does it take to receive our photos and videos?',
    answer: 'Photos are typically delivered within 3-4 weeks after the event. Edited highlight videos are delivered within 6-8 weeks, and full wedding films within 8-12 weeks. Rush delivery options are available for an additional fee.',
    category: 'delivery',
    order: 3,
  },
  {
    id: 'faq4',
    question: 'Do you travel for destination weddings?',
    answer: 'Yes! We love destination weddings and have covered events across India and internationally. Travel and accommodation costs are discussed during the booking process and are typically included in the final quote.',
    category: 'booking',
    order: 4,
  },
  {
    id: 'faq5',
    question: 'What is your cancellation policy?',
    answer: 'Cancellations made 6+ months before the event receive a 50% refund of the deposit. Cancellations made 3-6 months before receive a 25% refund. Cancellations within 3 months are non-refundable. We recommend event insurance.',
    category: 'booking',
    order: 5,
  },
  {
    id: 'faq7',
    question: 'Can we get the raw, unedited photos?',
    answer: 'Our packages include professionally edited photos. Raw files can be purchased separately as an add-on service. We recommend the edited versions as they showcase our artistic vision and professional color grading.',
    category: 'delivery',
    order: 7,
  },
  {
    id: 'faq8',
    question: 'How many photographers will be at our event?',
    answer: 'This depends on your package and event size. Typically, we provide 2-3 photographers and 1-2 videographers for full-day wedding coverage to ensure we capture every angle and moment.',
    category: 'general',
    order: 8,
  },
  {
    id: 'faq9',
    question: 'What are your payment terms?',
    answer: 'We require a 30% deposit to secure your date, 40% payment one month before the event, and the final 30% upon delivery of photos. We accept bank transfers, UPI, and credit cards.',
    category: 'pricing',
    order: 9,
  },
  {
    id: 'faq10',
    question: 'Do you provide albums and prints?',
    answer: 'Yes, we offer premium wedding albums, canvas prints, and framed photos as add-ons. These can be ordered after reviewing your edited photos through our online gallery.',
    category: 'delivery',
    order: 10,
  },
];

// Mock leads data
export const mockLeads: Lead[] = [
  {
    id: 'l1',
    name: 'Kavya Mehta',
    email: 'kavya.mehta@example.com',
    phone: '+91 98765 43210',
    eventType: 'wedding',
    message: 'Hi! We are planning our wedding for March 2025 in Jaipur. Would love to discuss your packages and availability.',
    submittedAt: '2024-12-30T10:30:00Z',
    status: 'new',
  },
  {
    id: 'l2',
    name: 'Aditya Kumar',
    email: 'aditya.k@example.com',
    phone: '+91 87654 32109',
    eventType: 'pre-wedding',
    message: 'Looking for a pre-wedding shoot in Goa. What are your rates for a 2-day shoot?',
    submittedAt: '2024-12-29T14:15:00Z',
    status: 'contacted',
    notes: 'Sent initial quote via email. Follow up on Jan 2nd.',
  },
  {
    id: 'l3',
    name: 'Riya Gupta',
    email: 'riya.gupta@example.com',
    phone: '+91 76543 21098',
    eventType: 'event',
    message: 'We need coverage for our corporate event on Feb 15th. Can you handle large events?',
    submittedAt: '2024-12-28T09:45:00Z',
    status: 'converted',
    notes: 'Booked! 50% deposit received.',
  },
  {
    id: 'l4',
    name: 'Sanjay Sharma',
    email: 'sanjay.s@example.com',
    phone: '+91 65432 10987',
    eventType: 'wedding',
    message: 'Interested in your wedding packages. Our wedding is in April 2025. Please send details.',
    submittedAt: '2024-12-27T16:20:00Z',
    status: 'contacted',
    notes: 'Had a call. Waiting for their budget confirmation.',
  },
  {
    id: 'l5',
    name: 'Neha Patel',
    email: 'neha.patel@example.com',
    phone: '+91 54321 09876',
    eventType: 'film',
    message: 'Do you create cinematic wedding films? We love your work on Instagram!',
    submittedAt: '2024-12-26T11:00:00Z',
    status: 'new',
  },
  {
    id: 'l6',
    name: 'Rohit Joshi',
    email: 'rohit.joshi@example.com',
    phone: '+91 43210 98765',
    eventType: 'pre-wedding',
    message: 'Planning a destination pre-wedding shoot in Manali. Are you available in January?',
    submittedAt: '2024-12-25T13:30:00Z',
    status: 'closed',
    notes: 'Went with another vendor due to budget constraints.',
  },
  {
    id: 'l7',
    name: 'Priyanka Singh',
    email: 'priyanka.singh@example.com',
    phone: '+91 32109 87654',
    eventType: 'wedding',
    message: 'Need urgent help! Our photographer canceled. Wedding is on Jan 20th. Are you available?',
    submittedAt: '2024-12-24T18:45:00Z',
    status: 'contacted',
    notes: 'Checking team availability. Priority lead!',
  },
  {
    id: 'l8',
    name: 'Aryan Kapoor',
    email: 'aryan.kapoor@example.com',
    phone: '+91 21098 76543',
    eventType: 'other',
    message: 'Interested in baby shower photography. Do you cover such events?',
    submittedAt: '2024-12-23T10:15:00Z',
    status: 'new',
  },
];