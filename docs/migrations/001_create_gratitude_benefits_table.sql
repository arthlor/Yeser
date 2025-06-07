-- Migration: Create gratitude_benefits table for "Why Gratitude Matters" screen
-- Date: 2024-01-01
-- Author: Yeser Development Team
-- Purpose: Add CMS-ready content management for gratitude benefits information

BEGIN;

-- Create the gratitude_benefits table
CREATE TABLE IF NOT EXISTS public.gratitude_benefits (
  id SERIAL PRIMARY KEY,
  icon TEXT NOT NULL CHECK (char_length(icon) > 0),
  title_tr TEXT NOT NULL CHECK (char_length(title_tr) > 0),
  description_tr TEXT NOT NULL CHECK (char_length(description_tr) > 0),
  stat_tr TEXT CHECK (stat_tr IS NULL OR char_length(stat_tr) > 0),
  cta_prompt_tr TEXT CHECK (cta_prompt_tr IS NULL OR char_length(cta_prompt_tr) > 0),
  display_order INT NOT NULL DEFAULT 0 CHECK (display_order >= 0),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE public.gratitude_benefits IS 'Stores content for the "Why Gratitude Matters" screen with CMS capabilities';
COMMENT ON COLUMN public.gratitude_benefits.icon IS 'Material Design icon name for the benefit';
COMMENT ON COLUMN public.gratitude_benefits.title_tr IS 'Turkish title of the gratitude benefit';
COMMENT ON COLUMN public.gratitude_benefits.description_tr IS 'Detailed Turkish description of the benefit';
COMMENT ON COLUMN public.gratitude_benefits.stat_tr IS 'Optional compelling statistic or fact related to the benefit';
COMMENT ON COLUMN public.gratitude_benefits.cta_prompt_tr IS 'Optional call-to-action prompt for journaling related to this benefit';
COMMENT ON COLUMN public.gratitude_benefits.display_order IS 'Order for displaying benefits (ascending)';
COMMENT ON COLUMN public.gratitude_benefits.is_active IS 'Whether this benefit should be displayed in the app';

-- Create performance index for active benefits ordered by display_order
CREATE INDEX IF NOT EXISTS idx_gratitude_benefits_active_order 
  ON public.gratitude_benefits (is_active, display_order) 
  WHERE is_active = true;

-- Create index for efficient querying of active benefits
CREATE INDEX IF NOT EXISTS idx_gratitude_benefits_active 
  ON public.gratitude_benefits (is_active) 
  WHERE is_active = true;

-- Enable Row Level Security
ALTER TABLE public.gratitude_benefits ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: Allow authenticated users to read active benefits
CREATE POLICY "Authenticated users can read active benefits"
  ON public.gratitude_benefits
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Create RLS policy: Only service role can manage content (for CMS)
CREATE POLICY "Service role can manage benefits"
  ON public.gratitude_benefits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_gratitude_benefits_updated_at 
  BEFORE UPDATE ON public.gratitude_benefits 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Insert initial content
INSERT INTO public.gratitude_benefits 
  (icon, title_tr, description_tr, stat_tr, cta_prompt_tr, display_order)
VALUES
  (
    'emoticon-happy-outline', 
    'Mutluluğu Artırır', 
    'Şükran pratiği, beynin mutluluk merkezlerini uyararak pozitif duyguları artırır ve hayata daha olumlu bakmanızı sağlar.', 
    'Mutluluğu %25''e kadar artırabilir.', 
    'Seni bugün gülümseten birini yaz.', 
    1
  ),
  (
    'waves', 
    'Stresi Azaltır', 
    'Sahip olduklarınıza odaklanmak, endişe ve korku gibi negatif duyguları azaltır, daha sakin ve huzurlu hissetmenize yardımcı olur.', 
    'Stres hormonu kortizolü %23 oranında düşürür.', 
    'Sana huzur veren bir yeri veya anı yaz.', 
    2
  ),
  (
    'shield-check-outline', 
    'Zihinsel Dayanıklılığı Güçlendirir', 
    'Zor zamanlarda bile minnettar olacak şeyler bulmak, psikolojik dayanıklılığı artırır ve krizlerle daha iyi başa çıkmanızı sağlar.', 
    'Dayanıklılığı ve başa çıkma becerilerini artırır.', 
    'Geçmişteki bir zorluğun üstesinden nasıl geldiğini yaz.', 
    3
  ),
  (
    'account-heart-outline', 
    'İlişkileri Güçlendirir', 
    'İnsanlara minnettarlığınızı ifade etmek, sosyal bağları kuvvetlendirir ve ilişkilerde daha derin bir anlayış ve takdir ortamı yaratır.', 
    'Yakın ilişkilerde memnuniyeti artırır.', 
    'Hayatındaki önemli bir insana neden minnettar olduğunu yaz.', 
    4
  ),
  (
    'sleep', 
    'Uyku Kalitesini İyileştirir', 
    'Yatmadan önce şükrettiklerinizi yazmak, zihni sakinleştirir ve daha derin, dinlendirici bir uykuya dalmanıza yardımcı olabilir.', 
    'Daha uzun ve daha dinlendirici uyku sağlar.', 
    'Günün en huzurlu anını yaz.', 
    5
  ),
  (
    'school-outline', 
    'Öz Değeri Yükseltir', 
    'Sadece dış etkenlere değil, kendi başarılarınıza ve niteliklerinize de şükretmek, kendinize olan saygınızı ve güveninizi artırır.', 
    'Daha az sosyal karşılaştırma ve kıskançlık hissettirir.', 
    'Bugün başardığın küçük bir şeyi yaz.', 
    6
  )
ON CONFLICT DO NOTHING;

COMMIT; 