import { generateCellId } from '../../components/editor/lib/utils'
import mathCheatsheetImg from '../../assets/math_cheatsheet.jpg'
import apiJsonImg from '../../assets/api_json.jpg'
import reserachPaperImg from '../../assets/reserach_paper.jpg'
import englishNotesImg from '../../assets/english_notes.jpg'
import mitochondriaBiologyImg from '../../assets/mitochondria_biology.jpg'
import {
  editorBlockContentToRaw,
  editorBlockContentToMarkdown,
  editorBlockContentToHTML,
} from '../../components/editor/lib/editorStorage'

function p(text = '') {
  return { type: 'paragraph', id: generateCellId(), children: [{ text }] }
}

/** Paragraph with mixed text, inline math, and highlights. Parts: { text }, { text, highlight }, or { latex } */
function pWithChildren(parts) {
  const children = parts.map((part) => {
    if (part.latex != null) {
      return { type: 'inline-math', latex: part.latex, children: [{ text: '' }] }
    }
    const node = { text: part.text ?? '' }
    if (part.highlight) node.highlight = part.highlight
    return node
  })
  return { type: 'paragraph', id: generateCellId(), children }
}

function h1(text) {
  return { type: 'h1', id: generateCellId(), children: [{ text }] }
}

function h2(text) {
  return { type: 'h2', id: generateCellId(), children: [{ text }] }
}

function h3(text) {
  return { type: 'h3', id: generateCellId(), children: [{ text }] }
}

function hr() {
  return { type: 'horizontal_line', id: generateCellId(), lineStyle: 'solid', children: [{ text: '' }] }
}

function blockquote(parts) {
  const children = Array.isArray(parts)
    ? parts.map((part) => {
        if (part.highlight) return { text: part.text ?? '', highlight: part.highlight }
        return { text: part.text ?? '' }
      })
    : [{ text: typeof parts === 'string' ? parts : '' }]
  return { type: 'blockquote', id: generateCellId(), children }
}

function li(text = '') {
  return {
    type: 'list-item',
    id: generateCellId(),
    children: [{ type: 'paragraph', id: generateCellId(), children: [{ text }] }],
  }
}

function bulletedList(items) {
  return {
    type: 'bulleted-list',
    id: generateCellId(),
    children: items.map((text) => li(text)),
  }
}

function numberedList(items) {
  return {
    type: 'numbered-list',
    id: generateCellId(),
    children: items.map((text) => li(text)),
  }
}

/** List item with rich children (text + highlight/inline-math) */
function liRich(children) {
  return {
    type: 'list-item',
    id: generateCellId(),
    children: [{ type: 'paragraph', id: generateCellId(), children }],
  }
}

function numberedListRich(items) {
  const children = items.map((child) =>
    Array.isArray(child) ? liRich(child) : li(typeof child === 'string' ? child : ''),
  )
  return { type: 'numbered-list', id: generateCellId(), children }
}

function mathBlock(latex) {
  return { type: 'math', id: generateCellId(), latex, children: [{ text: '' }] }
}

function graphBlock(expression) {
  return { type: 'graph', id: generateCellId(), expression, latex: '', children: [{ text: '' }] }
}

function sketchBlock() {
  return { type: 'sketch', id: generateCellId(), sketchData: { elements: [], appState: {}, files: {} }, children: [{ text: '' }] }
}

function imageBlock() {
  return { type: 'image', id: generateCellId(), children: [{ text: '' }] }
}

function codeBlock(content) {
  return { type: 'code', id: generateCellId(), codeContent: content ?? '', children: [{ text: '' }] }
}

function table(rows, cols, hasHeader, headerCells, cells) {
  return {
    type: 'table',
    id: generateCellId(),
    rows,
    cols,
    hasHeader: !!hasHeader,
    headerCells: headerCells || Array(cols).fill(''),
    cells: cells || Array.from({ length: rows }, () => Array(cols).fill('')),
    children: [{ text: '' }],
  }
}

function columns(leftBlocks, rightBlocks) {
  return {
    type: 'columns-container',
    id: generateCellId(),
    children: [
      { type: 'column', id: generateCellId(), children: leftBlocks },
      { type: 'column', id: generateCellId(), children: rightBlocks },
    ],
  }
}

// Highlight colors: yellow, pink (red-like), teal, blue, neon-green
const HL = { yellow: '#fef08a', pink: '#f9a8d4', teal: '#5eead4', blue: '#93c5fd', green: '#39ff14' }

/** Document templates with structured content. Each has id, label, title, and getValue() returning editor value. */
export const DOCUMENT_TEMPLATES = [
  {
    id: "math-cheatsheet",
    label: "📐 Math Cheatsheet",
    title: "Ultimate Exam Guide & Cheat Sheet 📐",
    thumbnail: mathCheatsheetImg,
    getValue: () => [
      h1("Ultimate Exam Guide & Cheat Sheet 📐"),
      h2("EQUATION & INEQUALITIES 📝"),
      h3("Completing The Square"),
      mathBlock(
        "2x^2 - 5x + 9 = 2\\left(x^2 - \\frac{5}{2}x\\right) + 9 = 2\\left(x - \\frac{5}{4}\\right)^2 + \\frac{47}{8}",
      ),
      h3("Quadratic Inequalities [Divide negative, flip sign if it's -x²]"),
      pWithChildren([
        { text: "(x+3)(x-4) " },
        { text: "> 0", highlight: HL.pink },
        { text: "  →  x < -3 or x > 4" },
      ]),
      pWithChildren([
        { text: "(x+3)(x-4) " },
        { text: "< 0", highlight: HL.pink },
        { text: "  →  -3 < x < 4" },
      ]),
      graphBlock("x^2-1"),
      p(
        "(Number line: open circles at -3, 4; shade outwards for >0, between for <0)",
      ),
      h3("Question Type 1: Quadratic Inequalities"),
      numberedList([
        "Step 1: Flush everything to the left and rearrange according to ax² + bx + c",
        "Step 2: Simplify and rearrange according to ax² + bx + c",
        "Step 3: Solve your quadratic inequalities",
      ]),
      h3("Question Type 2: Reverse Quadratic Inequalities"),
      numberedListRich([
        "Step 1: x < -3 or x > 2",
        [
          {
            text: "Step 2: (x+3)(x-2) > 0 (Reverse and Form Back Original)",
            highlight: HL.pink,
          },
        ],
        "Step 3: x²+x-6>0 (Expand)",
        "Step 4: x²-6 > -x (Rearrange according to question)",
        [
          {
            text: "Step 5: q = -6, p = 1 (Compare coefficient)",
            highlight: HL.pink,
          },
        ],
      ]),
      hr(),
      h2("NATURE OF ROOTS 🌿"),
      h3("Determinants (Curve & Axis)"),
      table(
        4,
        3,
        true,
        ["b²-4ac", "Number of Roots", "Nature"],
        [
          ["< 0", "No Roots", "No Real Roots or Imaginary Roots"],
          ["= 0", "1 Root", "Real & Equal or Real & Repeated Roots"],
          ["> 0", "2 Roots", "Graph Intersects the x-axis"],
          ["≥ 0", "1 or 2 Roots", "At least one real root"],
        ],
      ),
      p("Graphs showing roots:"),
      columns(
        [graphBlock("x^2-1"), p("2 Roots ✓"), graphBlock("x^2"), p("1 Root ✓")],
        [graphBlock("x^2+1"), p("No Roots ✓")],
      ),
      h3("Question Type 1: Nature of Roots"),
      numberedListRich([
        "Equate Curve and Line if applicable",
        "Flush everything to the left and rearrange according to ax² + bx + c",
        "Determine Nature of Roots based on the condition",
        "Simplify and rearrange",
        "Solve your quadratic inequalities",
        [{ text: "Reject if Necessary", highlight: HL.pink }],
      ]),
      h3("Question Type 2: Proving Questions (Prove/Show/Explain)"),
      numberedList([
        "Rearrange to ax² + bx + c",
        "Apply b²-4ac (without the sign)",
        "Simplify",
        "Use Completing The Square / otherwise (See Condition)",
        "Conclude: expression is positive/negative (Proven)",
      ]),
      h3("Example"),
      mathBlock("b^2-4ac = [- (k+2)]^2 - 4(3)(2k-9) = (k-10)^2 + 12"),
      p(
        "Since (k-10)² + 12 > 0, b²-4ac > 0 and line intersects the curve for all real values of k. ✓",
      ),
      hr(),
      h2("SURDS 🔢"),
      columns(
        [
          h3("Multiplication:"),
          pWithChildren([{ text: "√a × √b = √ab" }]),
          pWithChildren([{ text: "a√b × c√d = ac√bd" }]),
          pWithChildren([{ text: "√a × √a = a" }]),
          pWithChildren([{ text: "b√a × b√a = b²a" }]),
          h3("Division:"),
          pWithChildren([{ text: "√a ÷ √b = √(a/b)" }]),
          h3("Addition & Subtraction:"),
          pWithChildren([{ text: "2√3 + 5√3 = 7√3" }]),
          pWithChildren([{ text: "4√2 - √2 = 3√2" }]),
          pWithChildren([
            {
              text: "Similar terms can be added or subtracted",
              highlight: HL.yellow,
            },
          ]),
        ],
        [
          h3("Key To Solving Surds"),
          p("Simplify all surds to their simplest forms"),
          p("Number × Number:"),
          pWithChildren([{ text: "√50 = 5√2" }]),
          p("Surd × Surd:"),
          pWithChildren([{ text: "√27 = 3√3" }]),
        ],
      ),
      h3("Rationalisation of Surds (We don't like √ in denominator)"),
      pWithChildren([
        { text: "Note: Change signs while rationalising", highlight: HL.pink },
      ]),
      p("Multiply by √2/√2, √3/√3, or conjugate (2-√3)/(2-√3)"),
      pWithChildren([{ text: "a√b + c√d = x√b + y√d  ⇒  a = x and c = y" }]),
      p("E.g. 3a + b + 2a√5 = -29 - 12√5"),
      pWithChildren([
        { text: "3a + b", highlight: HL.yellow },
        { text: " = ", highlight: HL.yellow },
        { text: "-29", highlight: HL.yellow },
        { text: ";  ", highlight: HL.yellow },
        { text: "2a√5", highlight: HL.blue },
        { text: " = ", highlight: HL.blue },
        { text: "-12√5", highlight: HL.blue },
        { text: "  ⇒  2a = -12, 3a + b = -29" },
      ]),
      h3("Mensuration with Surds 📏"),
      table(
        6,
        3,
        true,
        ["Shape", "Surface Area", "Volume"],
        [
          ["Cone", "πr² + πrl", "⅓πr²h"],
          ["Pyramid", "Add all sides", "Base area × Height"],
          ["Hemi-Sphere", "2πr² [open] / 3πr²", "⅔πr³"],
          ["Sphere", "4πr²", "⁴⁄₃πr³"],
          ["Prism", "Add all sides", "Base area × Height"],
          ["Cylinder", "2πr² + 2πrh", "πr²h"],
        ],
      ),
    ],
  },
  {
    id: "api-request",
    label: "API & JSON 🔌",
    title: "API Request & JSON",
    thumbnail: apiJsonImg,
    getValue: () => [
      h1("API Request & JSON 🔌"),
      h2("Request Details"),
      table(
        4,
        2,
        true,
        ["Property", "Value"],
        [
          ["Method", "GET / POST / PUT / DELETE"],
          ["URL", "https://api.example.com/v1/resource"],
          [
            "Headers",
            "Content-Type: application/json\nAuthorization: Bearer <token>",
          ],
          ["Body", "(See JSON below)"],
        ],
      ),
      hr(),
      h2("Request / Response JSON"),
      columns(
        [
          h3("Request Body"),
          codeBlock(`{
  "key": "value",
  "id": 123,
  "items": []
}`),
          p(
            "Explanation: Add your request payload here. Use valid JSON syntax.",
          ),
        ],
        [
          h3("Response (200 OK)"),
          codeBlock(`{
  "success": true,
  "data": {},
  "meta": {
    "page": 1,
    "total": 0
  }
}`),
          p(
            "Explanation: Document the expected or actual API response structure.",
          ),
        ],
      ),
      hr(),
      h2("Notes & Explanations"),
      p("• Authentication: Include API key or Bearer token in headers."),
      p(
        "• Error handling: Check for 4xx/5xx status codes and parse error body.",
      ),
      p("• Rate limits: Be aware of throttling and retry-after headers."),
    ],
  },
  {
    id: "quantum-physics",
    label: "Research Paper ⚛️",
    title: "⚛️ Research Paper",
    thumbnail: reserachPaperImg,
    getValue: () => [
      h1("Quantum Physics Research Paper ⚛️"),
      h2("Abstract"),
      p(
        "This paper explores key concepts in quantum mechanics including wave functions, the Schrödinger equation, and quantum superposition.",
      ),
      hr(),
      h2("1. Introduction"),
      p(
        "Quantum mechanics describes nature at the atomic and subatomic scale. The state of a quantum system is represented by a wave function",
      ),
      pWithChildren([
        { text: " ψ", latex: "\\psi" },
        { text: "(x, t), whose magnitude squared " },
        { text: "|ψ|²", latex: "|\\psi|^2" },
        { text: " gives the probability density of finding a particle." },
      ]),
      hr(),
      h2("2. Schrödinger Equation"),
      h3("Time-Dependent Form"),
      mathBlock(
        "i\\hbar \\frac{\\partial \\psi}{\\partial t} = -\\frac{\\hbar^2}{2m}\\nabla^2\\psi + V\\psi",
      ),
      p("Where"),
      pWithChildren([
        { text: " ℏ", latex: "\\hbar" },
        { text: " is the reduced Planck constant, " },
        { text: "m", latex: "m" },
        { text: " is mass, and " },
        { text: "V", latex: "V" },
        { text: " is the potential." },
      ]),
      h3("Time-Independent (Stationary)"),
      mathBlock(
        "-\\frac{\\hbar^2}{2m}\\frac{d^2\\psi}{dx^2} + V\\psi = E\\psi",
      ),
      hr(),
      h2("3. Wave Function & Probability"),
      columns(
        [
          h3("Wave Function ψ(x)"),
          graphBlock("sin(x)"),
          p("Sinusoidal wave: e.g. particle in infinite well, ground state."),
          graphBlock("exp(-x^2)"),
          p("Gaussian wave packet: localized probability."),
        ],
        [
          h3("Probability Density |ψ|²"),
          graphBlock("sin(x)^2"),
          p("Probability distribution for standing wave."),
          sketchBlock(),
          p("Sketch: Draw wave packets, interference, or potential wells."),
        ],
      ),
      hr(),
      h2("4. Quantum Numbers"),
      table(
        4,
        4,
        true,
        ["Quantum #", "Symbol", "Values", "Physical Meaning"],
        [
          ["Principal", "n", "1, 2, 3, …", "Energy level / shell"],
          ["Orbital", "ℓ", "0, 1, …, n−1", "Shape of orbital (s, p, d, f)"],
          ["Magnetic", "m_ℓ", "−ℓ to +ℓ", "Orientation in space"],
          ["Spin", "m_s", "±½", "Intrinsic angular momentum"],
        ],
      ),
      hr(),
      h2("5. Key Relations"),
      mathBlock(
        "E_n = \\frac{n^2 \\pi^2 \\hbar^2}{2mL^2} \\quad \\text{(Particle in a box)}",
      ),
      mathBlock(
        "\\Delta x \\cdot \\Delta p \\geq \\frac{\\hbar}{2} \\quad \\text{(Heisenberg uncertainty)}",
      ),
      pWithChildren([
        { text: "Superposition: ", highlight: HL.yellow },
        {
          text: "|ψ⟩ = c₁|ψ₁⟩ + c₂|ψ₂⟩",
          latex: "|\\psi\\rangle = c_1|\\psi_1\\rangle + c_2|\\psi_2\\rangle",
        },
        { text: " — system exists in multiple states until measured." },
      ]),
      hr(),
      h2("6. Results & Discussion"),
      p(""),
      p(""),
      h2("7. Conclusion"),
      p(""),
      h2("References"),
      bulletedList(["", "", ""]),
    ],
  },
  {
    id: "english-notes",
    label: "English Notes 📚",
    title: "Macbeth, the Tragic Hero 📚",
    thumbnail: englishNotesImg,
    getValue: () => [
      h1("Notes — Macbeth 📚"),
      h2("Plot Summary"),
      pWithChildren([
        { text: "Macbeth", highlight: HL.yellow },
        {
          text: ", a Scottish general, meets three witches who prophesy he will become ",
        },
        { text: "Thane of Cawdor", highlight: HL.pink },
        { text: " and then " },
        { text: "King of Scotland", highlight: HL.pink },
        { text: ". Spurred by ambition and his wife " },
        { text: "Lady Macbeth", highlight: HL.yellow },
        {
          text: ", he murders King Duncan and seizes the throne. Guilt and paranoia lead to more murders. " },
        { text: "Macduff", highlight: HL.teal },
        { text: " ultimately kills Macbeth; " },
        { text: "Malcolm", highlight: HL.teal },
        { text: " becomes king." },
      ]),
      hr(),
      h2("Characters"),
      table(
        6,
        3,
        true,
        ["Character", "Role", "Key Trait"],
        [
          ["Macbeth", "Protagonist / tragic hero", "Ambition, guilt"],
          ["Lady Macbeth", "Macbeth's wife", "Ruthlessness, eventual madness"],
          ["Banquo", "Macbeth's friend", "Integrity, suspicion"],
          ["Macduff", "Thane of Fife", "Loyalty, avenges Duncan"],
          ["Duncan", "King of Scotland", "Virtue, trust"],
          ["The Witches", "Supernatural", "Fate, prophecy"],
        ],
      ),
      h3("Character Descriptions"),
      pWithChildren([
        { text: "Macbeth", highlight: HL.yellow },
        {
          text: ": Starts noble but is corrupted by ambition. His conscience torments him (\"blood on my hands\").",
        },
      ]),
      pWithChildren([
        { text: "Lady Macbeth", highlight: HL.yellow },
        {
          text: ": Initially more ruthless than Macbeth. \"Unsex me here.\" Sleepwalks, guilt drives her to suicide.",
        },
      ]),
      hr(),
      h2("Act-by-Act Summary"),
      columns(
        [
          h3("Acts I–II"),
          pWithChildren([
            { text: "Act I", highlight: HL.blue },
            { text: ": Witches' prophecy; Macbeth named Thane of Cawdor; Lady Macbeth's persuasion." },
          ]),
          pWithChildren([
            { text: "Act II", highlight: HL.blue },
            { text: ": Duncan murdered; Macbeth crowned; Banquo suspects." },
          ]),
        ],
        [
          h3("Acts III–V"),
          pWithChildren([
            { text: "Act III", highlight: HL.blue },
            { text: ": Banquo killed; Fleance escapes; banquet ghost." },
          ]),
          pWithChildren([
            { text: "Acts IV–V", highlight: HL.blue },
            { text: ": More murders; Lady Macbeth's death; Birnam Wood; Macbeth slain." },
          ]),
        ],
      ),
      hr(),
      h2("Key Scenes"),
      bulletedList([
        "Witches' prophecy (Act I, Scene 3)",
        "Duncan's murder (Act II, Scene 2)",
        "Banquet scene — Banquo's ghost (Act III, Scene 4)",
        "Lady Macbeth's sleepwalking (Act V, Scene 1)",
        "Final battle — Macbeth slain by Macduff",
      ]),
      h2("Important Quotes"),
      blockquote([
        { text: "\"Is this a dagger which I see before me?\" — Macbeth, Act II", highlight: HL.yellow },
      ]),
      blockquote([
        { text: "\"Out, damned spot! Out, I say!\" — Lady Macbeth, Act V", highlight: HL.pink },
      ]),
      blockquote([
        { text: "\"By the pricking of my thumbs, something wicked this way comes.\" — Witch, Act IV", highlight: HL.teal },
      ]),
      hr(),
      h2("Themes"),
      pWithChildren([
        { text: "Ambition", highlight: HL.yellow },
        { text: ": Drives Macbeth and Lady Macbeth to immoral acts." },
      ]),
      pWithChildren([
        { text: "Guilt", highlight: HL.pink },
        { text: ": Haunts both; Lady Macbeth's hand-washing, Macbeth's visions." },
      ]),
      pWithChildren([
        { text: "Appearance vs Reality", highlight: HL.blue },
        { text: ": \"False face must hide what false heart doth know.\"" },
      ]),
      pWithChildren([
        { text: "Fate vs Free Will", highlight: HL.teal },
        { text: ": Prophecies drive action; do the witches cause events or merely foresee?" },
      ]),
      hr(),
      h2("Literary Devices"),
      table(
        4,
        2,
        true,
        ["Device", "Example"],
        [
          ["Symbolism", "Blood = guilt; darkness = evil"],
          ["Imagery", "Light/dark, blood, sleep"],
          ["Dramatic irony", "Audience knows Duncan will die; Macbeth doesn't see Banquo's ghost at first"],
          ["Foreshadowing", "Witches' prophecies; \"something wicked\""],
        ],
      ),
      h2("Setting"),
      p("Scotland, 11th century. Castles (Inverness, Dunsinane), heath, battlefields."),
      sketchBlock(),
      p("Sketch: Character map, plot diagram, or scene layout."),
      hr(),
      h2("Notes & Essay Ideas"),
      p(""),
      p(""),
    ],
  },
  {
    id: "biology-mitochondria",
    label: "Mitochondria 🧬",
    title: "Mitochondria, the Powerhouse of the Cell 🧬",
    thumbnail: mitochondriaBiologyImg,
    getValue: () => [
      h1("Mitochondria, the Powerhouse of the Cell 🧬"),
      h2("Overview"),
      p(
        "Mitochondria are membrane-bound organelles found in eukaryotic cells. Known as the \"powerhouse of the cell,\" they produce most of the cell's supply of adenosine triphosphate (ATP), the main energy currency.",
      ),
      p(
        "They have their own DNA (mtDNA) and are thought to have originated from endosymbiotic bacteria.",
      ),
      hr(),
      h2("Structure"),
      table(
        5,
        2,
        true,
        ["Component", "Description"],
        [
          ["Outer membrane", "Smooth; permeable to small molecules"],
          ["Inner membrane", "Folded into cristae; site of electron transport"],
          ["Intermembrane space", "Space between outer and inner membranes"],
          ["Matrix", "Innermost compartment; contains enzymes for Krebs cycle"],
          ["Cristae", "Folds that increase surface area for ATP synthesis"],
        ],
      ),
      columns(
        [
          h3("Diagram"),
          imageBlock(),
          p("Add an image: mitochondrial structure (label outer membrane, inner membrane, matrix, cristae)."),
        ],
        [
          h3("Key Facts"),
          bulletedList([
            "Size: ~0.5–1.0 μm",
            "Number per cell: varies (muscle cells have many)",
            "Contains: ribosomes, circular DNA",
            "Reproduce by binary fission",
          ]),
        ],
      ),
      hr(),
      h2("Functions"),
      table(
        4,
        2,
        true,
        ["Function", "Location / Process"],
        [
          ["ATP production", "Oxidative phosphorylation in inner membrane"],
          ["Cellular respiration", "Krebs cycle (matrix); ETC (cristae)"],
          ["Calcium storage", "Regulates cell signalling"],
          ["Apoptosis", "Releases cytochrome c to trigger cell death"],
        ],
      ),
      h2("Cellular Respiration Overview"),
      p(
        "Glycolysis occurs in the cytosol; pyruvate enters the mitochondrion. In the matrix: pyruvate → acetyl-CoA, then Krebs cycle. On the inner membrane: electron transport chain and chemiosmosis produce ATP.",
      ),
      imageBlock(),
      p("Add image: Cellular respiration pathway (glycolysis → Krebs cycle → ETC)."),
      hr(),
      h2("Comparison: Mitochondria vs Chloroplasts"),
      table(
        4,
        3,
        true,
        ["Feature", "Mitochondria", "Chloroplasts"],
        [
          ["Function", "ATP production (respiration)", "Glucose production (photosynthesis)"],
          ["Membranes", "Double (outer, inner)", "Double + thylakoid"],
          ["Main process", "Oxidative phosphorylation", "Light reactions + Calvin cycle"],
          ["Found in", "All eukaryotes", "Plants, algae"],
        ],
      ),
      hr(),
      h2("Notes"),
      p(""),
      p(""),
    ],
  },
];

/** Build patch payload from editor value (for saving template content). */
export function buildTemplateContentPayload(value) {
  const images = []
  const raw = editorBlockContentToRaw(value, images)
  const baseUrl = import.meta.env.VITE_APP_BACKEND_API || ''
  return {
    content_json: raw,
    content_markdown: editorBlockContentToMarkdown(value, images, { baseUrl }),
    content: editorBlockContentToHTML(value, images, { baseUrl }),
  }
}
