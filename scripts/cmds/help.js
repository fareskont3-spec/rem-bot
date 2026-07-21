const fs = require("fs-extra");
const path = require("path");
const https = require("https");

const smallCapsMap = {
  a:'ᴀ', b:'ʙ', c:'ᴄ', d:'ᴅ', e:'ᴇ', f:'ꜰ',
  g:'ɢ', h:'ʜ', i:'ɪ', j:'ᴊ', k:'ᴋ', l:'ʟ',
  m:'ᴍ', n:'ɴ', o:'ᴏ', p:'ᴘ', q:'ǫ', r:'ʀ',
  s:'ꜱ', t:'ᴛ', u:'ᴜ', v:'ᴠ', w:'ᴡ', x:'x',
  y:'ʏ', z:'ᴢ'
};

const cmdFontMap = {
  ...smallCapsMap,
  '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴',
  '5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹'
};

const toSmallCaps = t =>
  t.toLowerCase().split("").map(c => smallCapsMap[c] || c).join("");

const toCmdFont = t =>
  t.toLowerCase().split("").map(c => cmdFontMap[c] || c).join("");

module.exports = {
  config: {
    name: "help",
    aliases: ["menu", "مساعدة", "اوامر"],
    version: "6.0",
    author: "𝐒𝐈𝐅𝐀𝐓",
    shortDescription: "عرض جميع الأوامر المتاحة",
    longDescription: "يعرض قائمة الأوامر مقسمة حسب التصنيفات مع فيديو متحرك يتغير في كل مرة.",
    category: "النظام",
    guide: "{pn}help [اسم الأمر]"
  },

  onStart: async function ({ message, args, prefix }) {
    const allCommands = global.GoatBot.commands;
    const categories = {};

    const cleanCategoryName = (text) => {
      if (!text) return "أخرى";
      return text
        .normalize("NFKD")
        .replace(/[^\w\s\u0600-\u06FF-]/g, "") // السماح بالحروف العربية ضمن النطاق Unicode
        .replace(/\s+/g, " ")
        .trim()
        .toUpperCase();
    };

    if (!global.GoatBot.cacheHelp) {
      const cachedCategories = {};
      for (const [name, cmd] of allCommands) {
        if (!cmd?.config || name === "help") continue;
        const cat = cleanCategoryName(cmd.config.category);
        if (!cachedCategories[cat]) cachedCategories[cat] = [];
        cachedCategories[cat].push(name);
      }
      global.GoatBot.cacheHelp = cachedCategories;
    }
    const categoriesList = global.GoatBot.cacheHelp;

    const videoURLs = [
      "https://i.imgur.com/IudwgaP.mp4",
      "https://i.imgur.com/AMv8IqG.mp4",
      "https://i.imgur.com/xhFp4Rc.mp4",
      "https://i.imgur.com/EXar1VY.mp4",
      "https://i.imgur.com/vWigmIF.mp4",
      "https://i.imgur.com/V6Au0p4.mp4"
    ];

    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

    const indexFile = path.join(cacheDir, "help_video_index.json");
    let index = 0;
    if (fs.existsSync(indexFile)) {
      try {
        index = (JSON.parse(fs.readFileSync(indexFile)).index + 1) % videoURLs.length;
      } catch {}
    }
    fs.writeFileSync(indexFile, JSON.stringify({ index }));

    const videoPath = path.join(cacheDir, `help_video_${index}.mp4`);
    if (!fs.existsSync(videoPath)) {
      await downloadFile(videoURLs[index], videoPath);
    }

    if (args[0]) {
      const query = args[0].toLowerCase();
      const cmd = allCommands.get(query) || [...allCommands.values()].find(c => (c.config?.aliases || []).map(a => a.toLowerCase()).includes(query));

      if (!cmd || !cmd.config) return message.reply(`❌ عذراً، لم يتم العثور على الأمر "${query}".`);

      const { name, version, author, guide, category, longDescription, shortDescription, aliases } = cmd.config;
      const desc = longDescription?.ar || longDescription?.en || longDescription || shortDescription?.ar || shortDescription?.en || shortDescription || "لا يوجد وصف";
      const usage = (guide?.ar || guide?.en || guide || `{pn}${name}`).replace(/{pn}/g, prefix).replace(/{name}/g, name);

      const detailMsg =
        `╭┈─────┈─ ─┈────┈╮\n` +
        `  🌸 📇 معلومات الأمر 📇 🌸\n` +
        `╰┈─────┈─ ─┈────┈╯\n\n` +
        ` 🪷 ٱلاسـم: ${toSmallCaps(name)}\n` +
        ` 🪷 ٱلتصـنيف: ${category || "عام"}\n` +
        ` 🪷 ٱلأسماء ٱلبديلة: ${aliases?.length ? aliases.join(", ") : "لا يوجد"}\n` +
        ` 🪷 ٱلإصـدار: ${version || "1.0"}\n` +
        ` 🪷 ٱلمـطور: ${author || "S1FU"}\n\n` +
        ` ┌──────ʚ🍄ɞ──────┐\n` +
        `  📖 ٱلوصـف: ${desc}\n\n` +
        `  💡 طـريقة ٱلاستخدام: ${usage}\n` +
        ` └──────ʚ🍄ɞ──────┘\n\n` +
        ` 🌸 طـاب يومـك بكل خـير 🌸\n` +
        `╰┈───┈──────┈───┈╯`;

      return message.reply({ body: detailMsg, attachment: fs.createReadStream(videoPath) });
    }

    let msg = `╭┈─────┈──┈─────┈╮\n` +
              `       🌸 قـائمة الأوامر 🌸\n` +
              `╰┈─────┈──┈─────┈╯\n\n`;

    const sortedCategories = Object.keys(categoriesList).sort();

    for (const cat of sortedCategories) {
      msg += `╭┈─┈━[🌸 ${cat} ]\n`;
      const commands = categoriesList[cat].sort();
      for (let i = 0; i < commands.length; i += 2) {
        const a = toCmdFont(commands[i]);
        const b = commands[i + 1] ? toCmdFont(commands[i + 1]) : null;
        msg += b ? `┋⌬ ${a.padEnd(12)} ⌬ ${b}\n` : `┋⌬ ${a}\n`;
      }
      msg += `┕┈───┈──┈────┈┘\n\n`;
    }

    msg += `╭┈───────┈┈ ೄྀ࿐┐\n` +
           ` 🍄 ٱلإجمـالي: ${allCommands.size - 1}\n` +
           ` 🎀 ٱلـبادئة: ${prefix}\n` +
           ` 🌸 طـاب يومـك بكل خـير 🌸\n` +
           `╰┈──────┈──────┈─┘`;

    return message.reply({
      body: msg,
      attachment: fs.createReadStream(videoPath)
    });
  }
};

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, res => {
      if (res.statusCode !== 200) {
        fs.unlink(dest, () => {});
        return reject(new Error(`Failed to download '${url}' (${res.statusCode})`));
      }
      res.pipe(file);
      file.on("finish", () => file.close(resolve));
    }).on("error", err => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}
