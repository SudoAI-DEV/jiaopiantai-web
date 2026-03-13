import { getSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { styleTemplates } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OptimizedImage } from "@/components/ui/optimized-image";

async function getStyles() {
  return db
    .select()
    .from(styleTemplates)
    .orderBy(desc(styleTemplates.sortOrder));
}

export default async function AdminStylesPage() {
  const styles = await getStyles();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#4E342E]">风格模板管理</h1>
          <p className="text-gray-600">管理 AI 生成风格选项</p>
        </div>
        <button className="px-4 py-2 bg-[#FDD835] text-[#4E342E] font-medium rounded-lg hover:bg-[#FDD835]/90">
          添加新风格
        </button>
      </div>

      {/* Styles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {styles.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center text-gray-500">
              <p>暂无风格模板</p>
              <p className="text-sm mt-1">点击上方按钮添加第一个风格模板</p>
            </CardContent>
          </Card>
        ) : (
          styles.map((style) => (
            <Card key={style.id} className="overflow-hidden">
              <div className="aspect-video relative bg-gray-100">
                {style.thumbnailUrl ? (
                  <OptimizedImage
                    src={style.thumbnailUrl}
                    alt={style.name}
                    fill
                    aspectRatio="16/9"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-4xl">
                    🎨
                  </div>
                )}
                {!style.isActive && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white font-medium">已禁用</span>
                  </div>
                )}
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-[#4E342E]">{style.name}</h3>
                    {style.description && (
                      <p className="text-sm text-gray-500 mt-1">{style.description}</p>
                    )}
                  </div>
                  <button className="text-sm text-[#FDD835] hover:underline">
                    编辑
                  </button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
