import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/shared/brand-logo";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#FFF8E1]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FFF8E1]/80 backdrop-blur-md border-b border-[#4E342E]/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <BrandLogo
              size={40}
              priority
              className="gap-3"
              wordmarkClassName="text-[#4E342E] text-xl font-semibold"
            />
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#process" className="text-[#4E342E]/70 hover:text-[#4E342E] transition-colors">服务流程</a>
            <a href="#scenes" className="text-[#4E342E]/70 hover:text-[#4E342E] transition-colors">场景展示</a>
            <a href="#testimonials" className="text-[#4E342E]/70 hover:text-[#4E342E] transition-colors">客户评价</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="text-[#4E342E]">登录</Button>
            </Link>
            <Link href="/register">
              <Button className="bg-[#FDD835] text-[#4E342E] hover:bg-[#FFC107] font-medium">立即试用</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#FDD835]/20 rounded-full mb-6">
                <span className="w-2 h-2 bg-[#FDD835] rounded-full animate-pulse"></span>
                <span className="text-[#4E342E] text-sm font-medium">AI 智能商品图生成</span>
              </div>
              <h1 className="text-5xl lg:text-7xl font-bold text-[#4E342E] leading-[1.1] mb-6">
                让每一件商品
                <br />
                <span className="text-[#FDD835]">绽放光彩</span>
              </h1>
              <p className="text-xl text-[#4E342E]/70 mb-8 max-w-lg leading-relaxed">
                无需专业摄影团队，上传产品照片，AI 自动生成专业商品图。降低拍摄成本，提升展示效果。
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/register">
                  <Button size="lg" className="bg-[#FDD835] text-[#4E342E] hover:bg-[#FFC107] px-8 py-6 text-lg font-medium rounded-full">
                    免费体验
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="border-[#4E342E] text-[#4E342E] hover:bg-[#4E342E] hover:text-[#FFF8E1] px-8 py-6 text-lg rounded-full">
                  查看案例
                </Button>
              </div>
              <div className="flex items-center gap-8 mt-10 text-[#4E342E]/60">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-[#4E342E]">500+</span>
                  <span className="text-sm">商家选择</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-[#4E342E]">10,000+</span>
                  <span className="text-sm">图片生成</span>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2 relative">
              <div className="relative aspect-square max-w-lg mx-auto">
                <div className="absolute inset-0 bg-gradient-to-br from-[#FDD835]/30 to-[#FF9800]/20 rounded-3xl transform rotate-3"></div>
                <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden">
                  <Image
                    src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&h=800&fit=crop"
                    alt="AI Generated Product"
                    width={600}
                    height={600}
                    className="w-full h-full object-cover"
                    priority
                  />
                  <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-sm rounded-xl p-4">
                    <p className="text-sm text-[#4E342E] font-medium">AI 智能生成</p>
                    <p className="text-xs text-[#4E342E]/60">耗时 2 分钟</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Before/After Comparison */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1 bg-[#FDD835]/20 text-[#FF9800] text-sm font-medium rounded-full mb-4">
              效果对比
            </span>
            <h2 className="text-4xl lg:text-5xl font-bold text-[#4E342E] mb-4">
              真实案例对比
            </h2>
            <p className="text-xl text-[#4E342E]/60 max-w-2xl mx-auto">
              左边是商家原图，右边是 AI 优化后的效果
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Case 1 */}
            <div className="group">
              <div className="grid grid-cols-2 gap-1 rounded-2xl overflow-hidden shadow-lg">
                <div className="relative aspect-square">
                  <Image
                    src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop"
                    alt="Before"
                    width={300}
                    height={300}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">原图</span>
                </div>
                <div className="relative aspect-square">
                  <Image
                    src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop&sat=-100&brightness=1.1"
                    alt="After"
                    width={300}
                    height={300}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-2 right-2 bg-[#FDD835] text-[#4E342E] text-xs px-2 py-1 rounded font-medium">AI</span>
                </div>
              </div>
              <p className="mt-3 text-[#4E342E] font-medium">耳机产品</p>
            </div>

            {/* Case 2 */}
            <div className="group">
              <div className="grid grid-cols-2 gap-1 rounded-2xl overflow-hidden shadow-lg">
                <div className="relative aspect-square">
                  <Image
                    src="https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&h=400&fit=crop"
                    alt="Before"
                    width={300}
                    height={300}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">原图</span>
                </div>
                <div className="relative aspect-square">
                  <Image
                    src="https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&h=400&fit=crop&sat=-100&brightness=1.1"
                    alt="After"
                    width={300}
                    height={300}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-2 right-2 bg-[#FDD835] text-[#4E342E] text-xs px-2 py-1 rounded font-medium">AI</span>
                </div>
              </div>
              <p className="mt-3 text-[#4E342E] font-medium">相机配件</p>
            </div>

            {/* Case 3 */}
            <div className="group">
              <div className="grid grid-cols-2 gap-1 rounded-2xl overflow-hidden shadow-lg">
                <div className="relative aspect-square">
                  <Image
                    src="https://images.unsplash.com/photo-1560343090-f0409e92791a?w=400&h=400&fit=crop"
                    alt="Before"
                    width={300}
                    height={300}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">原图</span>
                </div>
                <div className="relative aspect-square">
                  <Image
                    src="https://images.unsplash.com/photo-1560343090-f0409e92791a?w=400&h=400&fit=crop&sat=-100&brightness=1.1"
                    alt="After"
                    width={300}
                    height={300}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-2 right-2 bg-[#FDD835] text-[#4E342E] text-xs px-2 py-1 rounded font-medium">AI</span>
                </div>
              </div>
              <p className="mt-3 text-[#4E342E] font-medium">护肤产品</p>
            </div>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section id="process" className="py-24 px-6 bg-[#4E342E] text-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <span className="inline-block px-4 py-1 bg-[#FDD835]/20 text-[#FDD835] text-sm font-medium rounded-full mb-4">
              服务流程
            </span>
            <h2 className="text-4xl lg:text-5xl font-bold mb-4">
              简单四步，获得专业商品图
            </h2>
            <p className="text-xl text-white/60 max-w-2xl mx-auto">
              从上传到交付，全程自动化处理
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Step 1 */}
            <div className="relative p-8 bg-white/5 rounded-3xl hover:bg-white/10 transition-colors">
              <div className="absolute -top-4 -left-4 w-12 h-12 bg-[#FDD835] text-[#4E342E] rounded-full flex items-center justify-center font-bold text-xl">
                1
              </div>
              <div className="mt-4">
                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-3">上传产品</h3>
                <p className="text-white/60 leading-relaxed">
                  上传产品原图，填写拍摄需求和目标场景
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative p-8 bg-white/5 rounded-3xl hover:bg-white/10 transition-colors">
              <div className="absolute -top-4 -left-4 w-12 h-12 bg-[#FDD835] text-[#4E342E] rounded-full flex items-center justify-center font-bold text-xl">
                2
              </div>
              <div className="mt-4">
                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-3">AI 生成</h3>
                <p className="text-white/60 leading-relaxed">
                  AI 智能识别产品特征，生成多张高质量商品图
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative p-8 bg-white/5 rounded-3xl hover:bg-white/10 transition-colors">
              <div className="absolute -top-4 -left-4 w-12 h-12 bg-[#FDD835] text-[#4E342E] rounded-full flex items-center justify-center font-bold text-xl">
                3
              </div>
              <div className="mt-4">
                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-3">人工审核</h3>
                <p className="text-white/60 leading-relaxed">
                  专业团队审核筛选，确保交付图片质量
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="relative p-8 bg-white/5 rounded-3xl hover:bg-white/10 transition-colors">
              <div className="absolute -top-4 -left-4 w-12 h-12 bg-[#FDD835] text-[#4E342E] rounded-full flex items-center justify-center font-bold text-xl">
                4
              </div>
              <div className="mt-4">
                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-3">下载使用</h3>
                <p className="text-white/60 leading-relaxed">
                  精选 6 张优质图片，直接下载用于电商展示
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Scene Gallery */}
      <section id="scenes" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1 bg-[#FDD835]/20 text-[#FF9800] text-sm font-medium rounded-full mb-4">
              场景模板
            </span>
            <h2 className="text-4xl lg:text-5xl font-bold text-[#4E342E] mb-4">
              多样化场景选择
            </h2>
            <p className="text-xl text-[#4E342E]/60 max-w-2xl mx-auto">
              根据您的产品特性选择最适合的展示场景
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { name: "简约白底", color: "#F5F5F5" },
              { name: "生活方式", color: "#E8D5B7" },
              { name: "专业棚拍", color: "#2D2D2D" },
              { name: "自然清新", color: "#C8E6C9" },
              { name: "高端奢华", color: "#1A1A1A" },
              { name: "电商标准", color: "#FFFFFF" },
            ].map((style, index) => (
              <div
                key={index}
                className="group relative aspect-square rounded-2xl overflow-hidden cursor-pointer"
                style={{ backgroundColor: style.color }}
              >
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                  <span className="text-white font-medium text-lg">{style.name}</span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent">
                  <p className="text-white font-medium">{style.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1 bg-[#FDD835]/20 text-[#FF9800] text-sm font-medium rounded-full mb-4">
              客户评价
            </span>
            <h2 className="text-4xl lg:text-5xl font-bold text-[#4E342E] mb-4">
              来自真实客户的声音
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="p-8 bg-[#FFF8E1] rounded-3xl">
              <div className="flex items-center gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg key={star} className="w-5 h-5 text-[#FDD835]" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-[#4E342E]/80 mb-6 leading-relaxed">
                "使用蕉片台后，我们店铺的商品图质量提升了好几个档次。关键是成本比请专业摄影师低太多了！"
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#FDD835] rounded-full flex items-center justify-center text-[#4E342E] font-bold">
                  张
                </div>
                <div>
                  <p className="font-semibold text-[#4E342E]">张老板</p>
                  <p className="text-sm text-[#4E342E]/60">某服装店店主</p>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="p-8 bg-[#FFF8E1] rounded-3xl">
              <div className="flex items-center gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg key={star} className="w-5 h-5 text-[#FDD835]" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-[#4E342E]/80 mb-6 leading-relaxed">
                "效率太高了！上午提交需求，下午就收到了精修的商品图。审核团队非常专业，筛选的图片都很满意。"
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#FDD835] rounded-full flex items-center justify-center text-[#4E342E] font-bold">
                  李
                </div>
                <div>
                  <p className="font-semibold text-[#4E342E]">李女士</p>
                  <p className="text-sm text-[#4E342E]/60">饰品店经营者</p>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="p-8 bg-[#FFF8E1] rounded-3xl">
              <div className="flex items-center gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg key={star} className="w-5 h-5 text-[#FDD835]" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-[#4E342E]/80 mb-6 leading-relaxed">
                "我们是小程序电商，以往都是自己用手机拍照。用了这个服务后，转化率明显提升了！"
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#FDD835] rounded-full flex items-center justify-center text-[#4E342E] font-bold">
                  王
                </div>
                <div>
                  <p className="font-semibold text-[#4E342E]">王先生</p>
                  <p className="text-sm text-[#4E342E]/60">电商运营负责人</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 px-6 bg-[#4E342E] text-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1 bg-[#FDD835]/20 text-[#FDD835] text-sm font-medium rounded-full mb-4">
              价格方案
            </span>
            <h2 className="text-4xl lg:text-5xl font-bold mb-4">
              灵活的计费方式
            </h2>
            <p className="text-xl text-white/60 max-w-2xl mx-auto">
              按需购买，不浪费任何一个点数
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {/* Starter */}
            <div className="p-8 bg-white/5 rounded-3xl border border-white/10">
              <h3 className="text-2xl font-bold mb-2">入门版</h3>
              <p className="text-white/60 mb-6">适合新手尝试</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">¥99</span>
                <span className="text-white/60">/10 点</span>
              </div>
              <ul className="space-y-3 mb-8 text-white/80">
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#FDD835]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  10 次商品图生成
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#FDD835]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  基础场景模板
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#FDD835]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  48 小时交付
                </li>
              </ul>
              <Button className="w-full bg-white text-[#4E342E] hover:bg-[#FDD835]">
                立即购买
              </Button>
            </div>

            {/* Professional */}
            <div className="p-8 bg-[#FDD835] rounded-3xl relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#FF9800] text-white text-sm font-medium rounded-full">
                最受欢迎
              </div>
              <h3 className="text-2xl font-bold mb-2 text-[#4E342E]">专业版</h3>
              <p className="text-[#4E342E]/70 mb-6">适合稳定运营</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-[#4E342E]">¥499</span>
                <span className="text-[#4E342E]/70">/60 点</span>
              </div>
              <ul className="space-y-3 mb-8 text-[#4E342E]/80">
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#4E342E]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  60 次商品图生成
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#4E342E]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  全部场景模板
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#4E342E]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  24 小时交付
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#4E342E]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  优先客服支持
                </li>
              </ul>
              <Button className="w-full bg-[#4E342E] text-white hover:bg-[#3E2723]">
                立即购买
              </Button>
            </div>

            {/* Enterprise */}
            <div className="p-8 bg-white/5 rounded-3xl border border-white/10">
              <h3 className="text-2xl font-bold mb-2">企业版</h3>
              <p className="text-white/60 mb-6">适合大规模使用</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">联系我们</span>
              </div>
              <ul className="space-y-3 mb-8 text-white/80">
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#FDD835]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  定制点数套餐
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#FDD835]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  专属客户经理
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#FDD835]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  API 接口对接
                </li>
              </ul>
              <Button variant="outline" className="w-full border-white text-white hover:bg-white hover:text-[#4E342E]">
                联系我们
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-[#FFF8E1]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl lg:text-5xl font-bold text-[#4E342E] mb-6">
            准备好提升商品展示效果了吗？
          </h2>
          <p className="text-xl text-[#4E342E]/70 mb-10 max-w-2xl mx-auto">
            立即注册，免费体验 AI 商品图生成服务
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link href="/register">
              <Button size="lg" className="bg-[#FDD835] text-[#4E342E] hover:bg-[#FFC107] px-10 py-6 text-lg font-medium rounded-full">
                立即免费体验
              </Button>
            </Link>
          </div>

          <div className="mt-16 grid sm:grid-cols-2 gap-8 max-w-xl mx-auto">
            <div className="flex items-center justify-center gap-4 p-6 bg-white rounded-2xl shadow-sm">
              <div className="w-12 h-12 bg-[#FDD835]/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-[#FDD835]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 01.598.082l1.584.926a.272.272 0 00.14.045c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 01-.023-.156.49.49 0 01.201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.269-.03-.406-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.97-.982z"/>
                </svg>
              </div>
              <div className="text-left">
                <p className="font-semibold text-[#4E342E]">微信公众号</p>
                <p className="text-sm text-[#4E342E]/60">扫码关注</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 p-6 bg-white rounded-2xl shadow-sm">
              <div className="w-12 h-12 bg-[#FDD835]/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-[#FDD835]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6.176 4.63a1.99 1.99 0 00-1.597.664l-3.012 4.518A1.992 1.992 0 002.2 11.4l2.157 2.157a2 2 0 002.828 0l2.116-2.116a2 2 0 000-2.828L6.176 4.63zm8.494 1.265a1.992 1.992 0 00-1.597-.664l-3.012 4.518A1.992 1.992 0 0010.556 17.4l2.157-2.157a2 2 0 002.828 0l2.116-2.116a2 2 0 000-2.828l-2.885-2.885-2.116 2.116a.996.996 0 00-.282-.141zM12 7a5 5 0 110 10 5 5 0 010-10z"/>
                </svg>
              </div>
              <div className="text-left">
                <p className="font-semibold text-[#4E342E]">联系电话</p>
                <p className="text-sm text-[#4E342E]/60">400-888-8888</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-[#4E342E] text-white/60">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <BrandLogo
                size={32}
                className="gap-3"
                iconWrapperClassName="rounded-lg bg-[#FFF8E1] p-1"
                wordmarkClassName="font-semibold text-white"
              />
            </div>
            <div className="flex items-center gap-6 text-sm">
              <a href="#" className="hover:text-white transition-colors">服务条款</a>
              <a href="#" className="hover:text-white transition-colors">隐私政策</a>
              <a href="#" className="hover:text-white transition-colors">联系我们</a>
            </div>
            <p className="text-sm">© 2026 蕉片台. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
