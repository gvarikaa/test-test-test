'use client';

import { useState, useRef, useEffect } from 'react';
import { Pen, Eraser, Trash2, Send, Loader2, X, SquareSlash, Undo, Square } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { api } from '@/lib/trpc/api';

interface HandwritingMessageProps {
  chatId: string;
  receiverId: string;
  onFinish: () => void;
  onCancel: () => void;
}

interface Stroke {
  points: { x: number; y: number; pressure: number }[];
  color: string;
  width: number;
}

interface StrokeData {
  strokes: Stroke[];
  backgroundColor?: string;
  penColor?: string;
  penWidth?: number;
}

export default function HandwritingMessage({
  chatId,
  receiverId,
  onFinish,
  onCancel,
}: HandwritingMessageProps) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [penColor, setPenColor] = useState('#ffffff');
  const [penWidth, setPenWidth] = useState(3);
  const [backgroundColor, setBackgroundColor] = useState('#333333');
  const [isEraser, setIsEraser] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  const { data: session } = useSession();
  
  // TRPC mutation for sending handwriting message
  const { mutate: sendHandwritingMessage } = api.chat.sendHandwritingMessage.useMutation({
    onSuccess: () => {
      onFinish();
    },
    onError: (err) => {
      setError(`Failed to send handwriting: ${err.message}`);
      setIsProcessing(false);
    },
  });
  
  // Set up canvas and drawing context
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    // Set canvas size based on container size
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    
    // Initial clear with background color
    if (context) {
      context.fillStyle = backgroundColor;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Redraw on resize
    const handleResize = () => {
      if (!canvasRef.current || !containerRef.current) return;
      
      const newCanvas = document.createElement('canvas');
      newCanvas.width = containerRef.current.clientWidth;
      newCanvas.height = containerRef.current.clientHeight;
      
      const newContext = newCanvas.getContext('2d');
      if (newContext) {
        // Fill background
        newContext.fillStyle = backgroundColor;
        newContext.fillRect(0, 0, newCanvas.width, newCanvas.height);
        
        // Copy content (with scaling if needed)
        newContext.drawImage(canvasRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height, 
                            0, 0, newCanvas.width, newCanvas.height);
        
        // Update canvas
        canvasRef.current.width = newCanvas.width;
        canvasRef.current.height = newCanvas.height;
        const context = canvasRef.current.getContext('2d');
        if (context) {
          context.drawImage(newCanvas, 0, 0);
        }
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [backgroundColor]);
  
  // Draw strokes on canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;
    
    // Clear canvas with background color
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw all strokes
    strokes.forEach(stroke => {
      if (stroke.points.length === 0) return;
      
      context.strokeStyle = stroke.color;
      context.lineWidth = stroke.width;
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.beginPath();
      
      const firstPoint = stroke.points[0];
      context.moveTo(firstPoint.x, firstPoint.y);
      
      for (let i = 1; i < stroke.points.length; i++) {
        const point = stroke.points[i];
        context.lineTo(point.x, point.y);
      }
      
      context.stroke();
    });
  }, [strokes, backgroundColor]);
  
  // Handle mouse and touch events for drawing
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pressure = e.pressure || 0.5; // Default pressure for devices that don't support it
    
    // Start a new stroke
    const newStroke: Stroke = {
      points: [{ x, y, pressure }],
      color: isEraser ? backgroundColor : penColor,
      width: isEraser ? penWidth * 2 : penWidth * (pressure + 0.5),
    };
    
    setCurrentStroke(newStroke);
    setIsDrawing(true);
    
    // Capture pointer to get events outside the canvas
    canvas.setPointerCapture(e.pointerId);
  };
  
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentStroke || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pressure = e.pressure || 0.5;
    
    // Add point to current stroke
    const updatedStroke = {
      ...currentStroke,
      points: [...currentStroke.points, { x, y, pressure }],
      width: isEraser ? penWidth * 2 : penWidth * (pressure + 0.5),
    };
    
    setCurrentStroke(updatedStroke);
    
    // Draw the current stroke in real-time
    const context = canvas.getContext('2d');
    if (context) {
      const lastPoint = currentStroke.points[currentStroke.points.length - 1];
      
      context.strokeStyle = updatedStroke.color;
      context.lineWidth = updatedStroke.width;
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.beginPath();
      context.moveTo(lastPoint.x, lastPoint.y);
      context.lineTo(x, y);
      context.stroke();
    }
  };
  
  const handlePointerUp = () => {
    if (!isDrawing || !currentStroke) return;
    
    // Add the completed stroke to strokes array
    setStrokes([...strokes, currentStroke]);
    setCurrentStroke(null);
    setIsDrawing(false);
  };
  
  // Handle color change
  const handleColorChange = (color: string) => {
    setPenColor(color);
    setIsEraser(false);
  };
  
  // Toggle eraser
  const toggleEraser = () => {
    setIsEraser(!isEraser);
  };
  
  // Clear canvas
  const clearCanvas = () => {
    setStrokes([]);
  };
  
  // Undo last stroke
  const undoLastStroke = () => {
    if (strokes.length === 0) return;
    setStrokes(strokes.slice(0, -1));
  };
  
  // Send handwriting message
  const sendHandwriting = async () => {
    if (strokes.length === 0 || !session?.user?.id) {
      setError('Draw something before sending');
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    
    const strokeData: StrokeData = {
      strokes,
      backgroundColor,
      penColor,
      penWidth,
    };
    
    // Send the handwriting data
    sendHandwritingMessage({
      chatId,
      receiverId,
      strokes: strokeData,
      backgroundColor,
      penColor,
      penWidth,
    });
  };
  
  // Color palette
  const colors = [
    '#ffffff', // White
    '#ff5555', // Red
    '#55ff55', // Green
    '#5555ff', // Blue
    '#ffff55', // Yellow
    '#ff55ff', // Magenta
    '#55ffff', // Cyan
    '#ff9955', // Orange
  ];
  
  return (
    <div className="p-3 bg-gray-800 rounded-lg border border-gray-700 shadow-lg">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-white text-sm font-medium">Handwriting Message</h3>
        <button
          onClick={onCancel}
          className="p-1 text-gray-400 hover:text-white rounded-full"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      
      {/* Drawing canvas */}
      <div 
        ref={containerRef}
        className="relative w-full h-64 bg-gray-900 rounded-md overflow-hidden mb-3"
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="absolute top-0 left-0 w-full h-full touch-none"
        />
      </div>
      
      {/* Drawing tools */}
      <div className="flex justify-between mb-3">
        <div className="flex items-center space-x-1">
          {/* Color palette */}
          {colors.map((color) => (
            <button
              key={color}
              onClick={() => handleColorChange(color)}
              className={`w-6 h-6 rounded-full ${penColor === color && !isEraser ? 'ring-2 ring-white' : ''}`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Pen size control */}
          <select
            value={penWidth}
            onChange={(e) => setPenWidth(Number(e.target.value))}
            className="bg-gray-700 text-white text-xs rounded px-1 py-1"
          >
            <option value="1">Thin</option>
            <option value="3">Medium</option>
            <option value="5">Thick</option>
            <option value="8">Very Thick</option>
          </select>
          
          {/* Eraser toggle */}
          <button
            onClick={toggleEraser}
            className={`p-1 rounded ${isEraser ? 'bg-accent-blue text-white' : 'bg-gray-700 text-gray-300'}`}
          >
            <Eraser className="h-4 w-4" />
          </button>
          
          {/* Undo button */}
          <button
            onClick={undoLastStroke}
            className="p-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
          >
            <Undo className="h-4 w-4" />
          </button>
          
          {/* Clear button */}
          <button
            onClick={clearCanvas}
            className="p-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {/* Background color selector */}
      <div className="mb-3">
        <div className="text-xs text-gray-400 mb-1">Background Color</div>
        <div className="flex items-center space-x-1">
          {['#333333', '#000000', '#003366', '#330033', '#663300'].map((color) => (
            <button
              key={color}
              onClick={() => setBackgroundColor(color)}
              className={`w-6 h-6 rounded ${backgroundColor === color ? 'ring-2 ring-white' : ''}`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="p-2 bg-red-900/40 border border-red-800 rounded-md text-red-200 text-xs mb-3">
          {error}
        </div>
      )}
      
      {/* Action buttons */}
      <div className="flex justify-between">
        <button
          onClick={onCancel}
          className="px-3 py-1 bg-gray-700 text-white text-sm rounded-md hover:bg-gray-600"
        >
          Cancel
        </button>
        <button
          onClick={sendHandwriting}
          disabled={isProcessing || strokes.length === 0}
          className="px-3 py-1 bg-accent-blue text-white text-sm rounded-md hover:bg-accent-blue-hover flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" /> 
              Sending...
            </>
          ) : (
            <>
              <Send className="h-3 w-3" /> Send
            </>
          )}
        </button>
      </div>
    </div>
  );
}