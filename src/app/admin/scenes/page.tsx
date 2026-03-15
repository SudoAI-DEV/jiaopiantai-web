import type { Metadata } from "next";
import { getSession } from "@/lib/auth-utils";
import { SCENES } from "@/lib/scenes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OptimizedImage } from "@/components/ui/optimized-image";

export const metadata: Metadata = {
  title: "场景模板管理",
};

export default async function AdminScenesPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#4E342E]">场景模板管理</h1>
          <p className="text-gray-600">代码内置场景（如需修改请编辑 src/lib/scenes.ts）</p>
        </div>
      </div>

      {/* Scenes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {SCENES.map((scene) => (
          <Card key={scene.id} className="overflow-hidden">
            <div className="aspect-video relative bg-gray-100">
              {scene.thumbnailUrl ? (
                <OptimizedImage
                  src={scene.thumbnailUrl}
                  alt={scene.name}
                  fill
                  aspectRatio="16/9"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-4xl">
                  🎨
                </div>
              )}
            </div>
            <CardContent className="p-4">
              <div>
                <h3 className="font-semibold text-[#4E342E]">{scene.name}</h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{scene.id}</p>
                <p className="text-sm text-gray-500 mt-1">{scene.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
