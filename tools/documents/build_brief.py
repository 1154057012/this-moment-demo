from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.colors import HexColor
from pypdf import PdfReader
import json

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'downloads'
OUT.mkdir(exist_ok=True)
pdfmetrics.registerFont(TTFont('CN', 'C:/Windows/Fonts/msyh.ttc', subfontIndex=0))
pdfmetrics.registerFont(TTFont('CNB', 'C:/Windows/Fonts/msyhbd.ttc', subfontIndex=0))
INK = HexColor('#183E35')
GRAY = HexColor('#52645E')
PAPER = HexColor('#FBF8F1')
W,H=595.28,841.89
style = ParagraphStyle('body',fontName='CN',fontSize=10.8,leading=17.2,textColor=INK,wordWrap='CJK',spaceAfter=8)
small = ParagraphStyle('small',fontName='CN',fontSize=8.4,leading=12.5,textColor=GRAY,wordWrap='CJK')
c=canvas.Canvas(str(OUT/'product-brief.pdf'), pagesize=(W,H))
c.setTitle('这一刻｜产品说明与设计判断')
c.setAuthor('这一刻 · 独立概念作品')

def page(n,kicker,title,sub):
    c.setFillColor(PAPER);c.rect(0,0,W,H,fill=1,stroke=0)
    c.setFillColor(INK);c.setFont('CNB',10);c.drawString(42,H-44,'这一刻 / THIS MOMENT')
    c.setFillColor(GRAY);c.setFont('CN',8);c.drawRightString(W-42,H-44,'小影概念功能 · 非官方作品')
    c.setFillColor(HexColor('#CB754A'));c.setFont('CNB',9);c.drawString(42,H-82,kicker)
    c.setFillColor(INK);c.setFont('CNB',26);c.drawString(42,H-120,title)
    p=Paragraph(sub,small); _,h=p.wrap(W-84,50);p.drawOn(c,42,H-137-h)
    c.setStrokeColor(HexColor('#D7DED5'));c.line(42,42,W-42,42)
    c.setFillColor(GRAY);c.setFont('CN',8);c.drawString(42,27,'2026.10.28  /  AI与内容创作产品原型')
    c.drawRightString(W-42,27,f'{n:02d} / 05')
    return H-183

def block(y,title,body):
    c.setFillColor(INK);c.setFont('CNB',12);c.drawString(42,y,title);y-=12
    for s in body:
        p=Paragraph(s,style);_,h=p.wrap(W-84,650);y-=h;p.drawOn(c,42,y);y-=8
    return y-13

def note(y,body):
    p=Paragraph(body,small);_,h=p.wrap(W-106,100)
    c.setFillColor(HexColor('#EAF0E6'));c.roundRect(42,y-h-20,W-84,h+16,7,fill=1,stroke=0)
    p.drawOn(c,53,y-h-12)
    return y-h-44

y=page(1,'01 / 用户与问题','先留下，最重要的那一刻','一句话定位 · 用户场景 · 选择依据')
y=note(y,'帮助短途旅行后有零散视频、却不熟悉剪辑的用户，通过标记必留片段和一句话描述，让AI围绕重要瞬间组织出一条可预览、可修改的30秒旅行回忆短片。')
y=block(y,'一个具体场景',[
'周日晚上，用户和朋友结束海边一日游，手机里有约20段视频。她想睡前发朋友圈，却不知道选哪些镜头、怎么排序、配什么声音。',
'用户最想留下的是与朋友同行的片段。AI如果只挑清晰、漂亮的海景，就可能让风景占据过长篇幅，错过她最想表达的重点。'])
y=block(y,'用户是谁，要完成什么',[
'短途结伴旅行后，当晚有分享意愿，拥有手机碎片素材但缺少剪辑经验的人。目标是完成一条属于这次经历的短片，让朋友也能感受到当时的快乐。'])
y=block(y,'问题为什么值得解决',[
'从素材到作品，还有筛选、组织和处理声音的成本。更关键的是：素材的画面质量无法直接代表它对用户的意义。产品需要用很少的输入，让用户把个人重点交给AI。'])
y=note(y,'证据边界：提交者确认熟悉生活与旅行记录；以上人物、20段素材及海边故事是设计假设。未进行真实用户访谈，未声称已有留存或转化提升。')
assert y>52,y
c.showPage()

y=page(2,'02 / 产品流程','把“我想留下什么”交给AI','先明确重点，再生成草稿，最后局部修正')
for title,body in [
('01 进入与选片','从作品首页进入“体验海边一日游”，载入示例素材。用户可以预览、选择片段，标记“这段一定要保留”。Demo使用少量代表素材，真实场景可有约20段。'),
('02 一句话表达意图','输入“想记住和朋友一起去看海的下午”。完整8段示例为30秒，自定义选片时长随实际片段变化。必留片段提供具体锚点，描述补充表达方向。'),
('03 生成可预览草稿','展示整理素材、组织片段、准备预览等阶段；可取消并保留选择和输入。结果中能看到采用的素材，确认重要片段确实出现。'),
('04 修正一处，保留满意内容','选择“突出海浪声”，在必留片段降低配乐，突出后期加入的海浪录音。选择“缩短海景”，将第3、5段各由4秒缩到1秒，作品由30秒变24秒；第4段“同行的这一刻”仍保留6秒。可比较前后并撤销。'),
('05 保存，再决定下一步','完整8段且必留第4段时下载对应预制MP4；其余按选片实时合成WebM，需现代浏览器，等待约等于视频时长。标题只在草稿展示，未烧录入视频。可继续编辑或开始新作品。')]:
    y=block(y,title,[body])
y=note(y,'演示要点：修改前后必须产生可见或可听的差异。产品的控制权体现在“修改哪里、保留什么”，而不只是一句重新生成。')
assert y>52,y
c.showPage()

y=page(3,'03 / 状态与边界','一次不理想，也能继续','加载 · 失败恢复 · 结果修正 · 原型能力声明')
for title,body in [
('没有素材 / 读取失败','未选择素材时明确提示下一步条件。读取失败指出具体片段，提供重试、重选或跳过；保留其他选择，不让用户重新开始。'),
('加载中 / 生成失败','加载展示阶段并允许取消。失败保留素材与意图，允许重试或返回调整。不会用虚构的精确预计时间掩盖处理状态。'),
('结果不理想 / 修改可逆','用突出海浪声、缩短海景等具体操作纠正结果；比较前后、撤销修改。输入超出支持范围时，说明当前可用操作。'),
('真实可体验的部分','选片、必留标记、文字输入、状态反馈、视频预览、局部修改、撤销和视频下载。可另选必留片段；缩短操作应避开它。自定义选片按实际片段播放与导出。'),
('明确模拟的部分','AI理解、素材分析和成片使用规则及预制示例模拟，未连接真实AI模型；不承诺处理任意自然语言或任意个人素材。8段示例来自Pexels视频；原素材无声，海浪为后期加入的CC0实录、配乐为原创合成，均非现场原音。')]:
    y=block(y,title,[body])
y=note(y,'验收重点：主流程能完成；必留片段出现；修改产生差异；失败与取消后可恢复；手机与电脑可操作。完整测试状态以AI记录和交付说明为准。')
assert y>52,y
c.showPage()

y=page(4,'04 / 产品判断','用一个小流程，验证核心价值','取舍依据与验证计划；以下不作为已完成的市场验证')
items=[
('为什么选这个用户和场景','提交者熟悉生活旅行记录。旅行结束后有明确素材与分享任务，适合呈现“记录到作品”的完整流程，也便于后续找到真实用户验证。'),
('最核心的问题是什么','个人重要性不能由清晰度、稳定性或风景美感直接替代。需要低成本输入，帮助AI围绕用户的重点组织素材。'),
('为什么采用这个流程','先选片减少空白输入，再标记重点减少猜测；先给草稿，再局部修正。把复杂剪辑变成有限、可逆的选择。'),
('主动没有做什么','不做文生视频、数字人、社区、自动发布和完整时间轴。它们增加范围与学习成本，不直接验证本次核心假设。'),
('只能保留一个功能','围绕用户指定的必留片段组织现有素材成片。局部修正是让它可控的配套机制。'),
('最可能失败在哪里','用户多做了标记与描述，结果却没有更符合预期。真实产品还需处理风噪与配乐平衡；本次用独立海浪录音演示混音控制。')]
for title,body in items:y=block(y,title,[body])
y=note(y,'验证计划：找5位近期旅行并拍过视频的人，以交替顺序比较同素材的默认成片与标记后版本；观察保存意愿、必留片段和修改原因。小样本只发现问题，不外推市场结论。')
assert y>52,y
c.showPage()

y=page(5,'05 / 功能分析与AI披露','AI先给草稿，用户把关表达','CapCut自动字幕与人工校对 · AI使用摘要')
y=block(y,'喜欢的设计：自动字幕后可直接校对',[
'典型场景：为约一分钟的口述生活视频加字幕。逐句输入与对齐费力，自动字幕先提供文字和时间位置，用户再检查人名、地名、口语断句，调整文字、时间和样式。',
'有效机制：从零制作变成检查修正，生成结果仍在编辑流程中，用户保留对最终表达的控制。只改一处：探索集中核对疑似专有名词与不确定识别的入口，支持上下文试听；不在未核实版本时断言已有产品缺少它。'])
y=note(y,'真实性说明：本节为典型场景与机制分析，提交者尚未提供本人使用经历。正式提交前需补充真实素材、实际修改和具体感受；不能将本段冒充个人经历。')
y=block(y,'本次AI协作与修改',[
'Codex协助选题、流程、文案、网页与交付材料；提交者选择旅行方向，确认制作与GitHub交付。场景细节、功能分析和设计取舍由AI提出，需提交者审核采纳。',
'已调整：把宽泛的自动剪辑收窄到必留片段；把整条重生成改成局部修正；删除虚构调查结论和第一人称经历；明确模拟AI边界。详细工具、素材、测试与发布状态在AI使用记录按实际进展更新。'])
y=block(y,'公开资料与事实边界',[
'小影官方产品介绍支持既有产品背景；CapCut帮助说明支持字幕生成后调整文字、时间与样式。需求、场景、改进提案与验证方法均为设计推断，非小影官方规划。'])
refs=[('小影官方产品介绍','https://www.quvideo.com/zh/products'),('CapCut自动字幕帮助','https://www.capcut.com/help/how-to-recognise-subtitles')]
for label,url in refs:
    p=Paragraph(f'<link href="{url}" color="#346557">{label} · {url}</link>',small)
    _,h=p.wrap(W-84,50);y-=h;p.drawOn(c,42,y);y-=6
assert y>52,y
c.save()
reader=PdfReader(OUT/'product-brief.pdf')
assert len(reader.pages)==5
print(json.dumps({'pages':len(reader.pages),'bytes':(OUT/'product-brief.pdf').stat().st_size,'text_chars':[len(p.extract_text()) for p in reader.pages]},ensure_ascii=False))
