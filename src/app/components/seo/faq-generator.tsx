import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { FAQItem } from '@/lib/seo-optimization';
import { Button } from '@/app/components/ui';
import { Loader2, PlusCircle, Trash2, MoveUp, MoveDown, Edit } from 'lucide-react';

interface FAQGeneratorProps {
  content: string;
  existingFAQs?: FAQItem[];
  onFAQsGenerated?: (faqs: FAQItem[]) => void;
  className?: string;
}

export default function FAQGenerator({
  content,
  existingFAQs = [],
  onFAQsGenerated,
  className = '',
}: FAQGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [faqs, setFaqs] = useState<FAQItem[]>(existingFAQs);
  const [error, setError] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editQuestion, setEditQuestion] = useState('');
  const [editAnswer, setEditAnswer] = useState('');
  
  const generateFAQsMutation = trpc.seo.generateFAQs.useMutation({
    onSuccess: (data) => {
      setFaqs(data);
      if (onFAQsGenerated) {
        onFAQsGenerated(data);
      }
      setIsGenerating(false);
    },
    onError: (err) => {
      setError(`Failed to generate FAQs: ${err.message}`);
      setIsGenerating(false);
    }
  });

  const handleGenerateFAQs = async () => {
    setIsGenerating(true);
    setError(null);
    
    generateFAQsMutation.mutate({
      content,
      existingFAQs: faqs,
    });
  };
  
  const handleAddFAQ = () => {
    const newFAQs = [...faqs, { question: 'New question', answer: 'New answer' }];
    setFaqs(newFAQs);
    setEditingIndex(newFAQs.length - 1);
    setEditQuestion('New question');
    setEditAnswer('New answer');
    
    if (onFAQsGenerated) {
      onFAQsGenerated(newFAQs);
    }
  };
  
  const handleRemoveFAQ = (index: number) => {
    const newFAQs = faqs.filter((_, i) => i !== index);
    setFaqs(newFAQs);
    
    if (editingIndex === index) {
      setEditingIndex(null);
    } else if (editingIndex !== null && editingIndex > index) {
      setEditingIndex(editingIndex - 1);
    }
    
    if (onFAQsGenerated) {
      onFAQsGenerated(newFAQs);
    }
  };
  
  const handleMoveFAQ = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) || 
      (direction === 'down' && index === faqs.length - 1)
    ) {
      return;
    }
    
    const newFAQs = [...faqs];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [newFAQs[index], newFAQs[newIndex]] = [newFAQs[newIndex], newFAQs[index]];
    
    setFaqs(newFAQs);
    
    if (editingIndex === index) {
      setEditingIndex(newIndex);
    } else if (editingIndex === newIndex) {
      setEditingIndex(index);
    }
    
    if (onFAQsGenerated) {
      onFAQsGenerated(newFAQs);
    }
  };
  
  const handleEditFAQ = (index: number) => {
    setEditingIndex(index);
    setEditQuestion(faqs[index].question);
    setEditAnswer(faqs[index].answer);
  };
  
  const handleSaveEdit = () => {
    if (editingIndex === null) return;
    
    const newFAQs = [...faqs];
    newFAQs[editingIndex] = { question: editQuestion, answer: editAnswer };
    setFaqs(newFAQs);
    setEditingIndex(null);
    
    if (onFAQsGenerated) {
      onFAQsGenerated(newFAQs);
    }
  };
  
  const handleCancelEdit = () => {
    setEditingIndex(null);
  };
  
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">FAQ Generation</h3>
        <div className="flex gap-2">
          <Button 
            onClick={handleAddFAQ}
            variant="outline"
            size="sm"
          >
            <PlusCircle className="h-4 w-4 mr-1" />
            Add FAQ
          </Button>
          <Button 
            onClick={handleGenerateFAQs}
            disabled={isGenerating || !content}
            variant="primary"
            size="sm"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate FAQs'
            )}
          </Button>
        </div>
      </div>
      
      {error && (
        <div className="p-3 text-sm bg-red-100 text-red-800 rounded-md">
          {error}
        </div>
      )}
      
      <div className="space-y-4">
        {faqs.length === 0 ? (
          <div className="text-center py-8 border border-dashed rounded-md text-gray-500">
            No FAQs generated yet. Click "Generate FAQs" to create AI-suggested questions and answers based on your content.
          </div>
        ) : (
          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-white border rounded-md">
                {editingIndex === index ? (
                  <div className="p-4 space-y-3">
                    <input
                      type="text"
                      value={editQuestion}
                      onChange={(e) => setEditQuestion(e.target.value)}
                      className="w-full p-2 border rounded-md"
                      placeholder="Question"
                    />
                    <textarea
                      value={editAnswer}
                      onChange={(e) => setEditAnswer(e.target.value)}
                      className="w-full p-2 border rounded-md min-h-[100px]"
                      placeholder="Answer"
                    />
                    <div className="flex justify-end gap-2">
                      <Button 
                        onClick={handleCancelEdit}
                        variant="outline"
                        size="sm"
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleSaveEdit}
                        variant="primary"
                        size="sm"
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium">{faq.question}</h4>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => handleEditFAQ(index)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="Edit FAQ"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleMoveFAQ(index, 'up')}
                          className="text-gray-600 hover:text-gray-800 p-1"
                          disabled={index === 0}
                          title="Move up"
                        >
                          <MoveUp className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleMoveFAQ(index, 'down')}
                          className="text-gray-600 hover:text-gray-800 p-1"
                          disabled={index === faqs.length - 1}
                          title="Move down"
                        >
                          <MoveDown className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleRemoveFAQ(index)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Delete FAQ"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm mt-2">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {faqs.length > 0 && (
        <div className="bg-gray-50 p-4 rounded-md">
          <h4 className="font-medium text-sm text-gray-500 mb-2">FAQ Schema Preview</h4>
          <pre className="bg-gray-800 text-gray-200 p-3 rounded text-xs overflow-x-auto">
            {JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": faqs.map(faq => ({
                "@type": "Question",
                "name": faq.question,
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": faq.answer
                }
              }))
            }, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}