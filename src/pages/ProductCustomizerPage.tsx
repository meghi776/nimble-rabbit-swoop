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
  const canvasRef = useRef(null);
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

  useEffect(() => {
    // Fetch product data or something
  }, [productId]);

  useEffect(() => {
    if (canvasRef.current) {
      const newCanvas = new fabric.Canvas(canvasRef.current);
      setCanvas(newCanvas);

      newCanvas.on('selection:created', (e) => {
        if (e.selected && e.selected.length > 0) {
          const selectedObj = e.selected[0];
          const element = designElements.find(el => el.fabricObject === selectedObj);
          if (element) {
            setSelectedElementId(element.id);
          }
        }
      });

      newCanvas.on('selection:cleared', () => {
        setSelectedElementId(null);
      });

      return () => {
        newCanvas.dispose();
      };
    }
  }, [designElements]);

  const selectedElement = designElements.find(el => el.id === selectedElementId);

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-md p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Customize Your Product</h1>
        <Button>Save Design</Button>
      </header>

      <main className="flex-grow flex items-center justify-center p-4">
        <div className="relative">
          {/* Dummy product image */}
          <img src="https://placehold.co/400x600" alt="Product" className="rounded-lg shadow-lg" />
          <canvas ref={canvasRef} width={400} height={600} className="absolute top-0 left-0" />
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