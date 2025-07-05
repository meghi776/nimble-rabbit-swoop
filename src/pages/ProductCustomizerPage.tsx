import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { fabric } from 'fabric';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Trash2, Upload, Type, Palette } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// A made up type for the purpose of the example
type DesignElement = {
  id: string;
  type: 'text' | 'image';
  fabricObject: fabric.Object;
};

const ProductCustomizerPage = () => {
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [designElements, setDesignElements] = useState<DesignElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  
  // Dummy state for the snippet to make sense
  const [textValue, setTextValue] = useState('');
  const [fontSize, setFontSize] = useState(24);
  const [fontFamily, setFontFamily] = useState('Arial');
  const [textAlign, setTextAlign] = useState('left');
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [color, setColor] = useState('#000000');

  const logicalWidth = 400;
  const logicalHeight = 600;

  useEffect(() => {
    // Fetch product data or something
  }, [productId]);

  // Effect to initialize the canvas
  useEffect(() => {
    if (canvasRef.current) {
      const newCanvas = new fabric.Canvas(canvasRef.current, {
        width: logicalWidth,
        height: logicalHeight,
      });
      setCanvas(newCanvas);

      return () => {
        if (newCanvas) {
            newCanvas.dispose();
        }
        setCanvas(null);
      };
    }
  }, []); // Runs only once on mount

  // Effect for canvas event listeners
  useEffect(() => {
    if (!canvas) return;

    const onSelectionCreated = (e: fabric.IEvent) => {
      if (e.selected && e.selected.length > 0) {
        const selectedObj = e.selected[0];
        const element = designElements.find(el => el.fabricObject === selectedObj);
        if (element) {
          setSelectedElementId(element.id);
        }
      }
    };

    const onSelectionCleared = () => {
      setSelectedElementId(null);
    };

    canvas.on('selection:created', onSelectionCreated);
    canvas.on('selection:cleared', onSelectionCleared);

    return () => {
      canvas.off('selection:created', onSelectionCreated);
      canvas.off('selection:cleared', onSelectionCleared);
    };
  }, [canvas, designElements]);

  // Effect for making the canvas responsive
  useEffect(() => {
    if (!canvas || !containerRef.current) return;

    const container = containerRef.current;

    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        const { width } = entry.contentRect;
        const scale = width / logicalWidth;
        const height = logicalHeight * scale;

        canvas.setDimensions({ width, height });
        canvas.setZoom(scale);
        canvas.renderAll();
      }
    });

    resizeObserver.observe(container);

    // Initial resize
    const initialWidth = container.clientWidth;
    const initialScale = initialWidth / logicalWidth;
    const initialHeight = logicalHeight * initialScale;
    canvas.setDimensions({ width: initialWidth, height: initialHeight });
    canvas.setZoom(initialScale);
    canvas.renderAll();

    return () => {
      resizeObserver.disconnect();
    };
  }, [canvas]);

  const selectedElement = designElements.find(el => el.id === selectedElementId);

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-md p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Customize Your Product</h1>
        <Button>Save Design</Button>
      </header>

      <main className="flex-grow flex items-center justify-center p-4">
        <div ref={containerRef} className="relative w-full max-w-[400px]">
          {/* Dummy product image */}
          <img src="https://placehold.co/400x600" alt="Product" className="w-full h-auto rounded-lg shadow-lg" />
          <canvas ref={canvasRef} className="absolute top-0 left-0" />
        </div>
      </main>

      <footer className="bg-white dark:bg-gray-800 shadow-t-lg">
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-lg py-1 flex flex-wrap justify-center items-center gap-1 border-t border-gray-200 dark:border-gray-700 z-10">
          {selectedElementId && designElements.find(el => el.id === selectedElementId)?.type === 'text' ? (
            <div className="flex flex-col w-full items-center">
              <div className="flex items-center justify-center w-full overflow-x-auto py-1 px-4 scrollbar-hide">
                <Input type="text" value={textValue} onChange={(e) => setTextValue(e.target.value)} className="w-40 mx-2" />
                <Select value={fontFamily} onValueChange={setFontFamily}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Font" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Arial">Arial</SelectItem>
                    <SelectItem value="Verdana">Verdana</SelectItem>
                    <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                  </SelectContent>
                </Select>
                <Slider value={[fontSize]} onValueChange={(v) => setFontSize(v[0])} max={100} step={1} className="w-32 mx-2" />
                <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-10 h-10 p-1" />
              </div>
              <div className="flex items-center justify-center w-full py-1 px-4">
                <Button variant={isBold ? 'secondary' : 'ghost'} size="icon" onClick={() => setIsBold(!isBold)}><Bold className="h-4 w-4" /></Button>
                <Button variant={isItalic ? 'secondary' : 'ghost'} size="icon" onClick={() => setIsItalic(!isItalic)}><Italic className="h-4 w-4" /></Button>
                <Button variant={isUnderline ? 'secondary' : 'ghost'} size="icon" onClick={() => setIsUnderline(!isUnderline)}><Underline className="h-4 w-4" /></Button>
                <Button variant={textAlign === 'left' ? 'secondary' : 'ghost'} size="icon" onClick={() => setTextAlign('left')}><AlignLeft className="h-4 w-4" /></Button>
                <Button variant={textAlign === 'center' ? 'secondary' : 'ghost'} size="icon" onClick={() => setTextAlign('center')}><AlignCenter className="h-4 w-4" /></Button>
                <Button variant={textAlign === 'right' ? 'secondary' : 'ghost'} size="icon" onClick={() => setTextAlign('right')}><AlignRight className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-red-500" /></Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="outline"><Type className="mr-2 h-4 w-4" /> Add Text</Button>
              <Button variant="outline"><Upload className="mr-2 h-4 w-4" /> Upload Image</Button>
              <Button variant="outline"><Palette className="mr-2 h-4 w-4" /> Product Colors</Button>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
};

export default ProductCustomizerPage;