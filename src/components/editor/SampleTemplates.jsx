/**
 * Sample templates for the editor. Use SAMPLE_TEMPLATES[0] as default.
 * Add more entries for a future "Select a template" feature (id, name, data).
 */
export const SAMPLE_TEMPLATES = [
  {
    id: 'lorem-ipsum',
    name: 'Lorem Ipsum',
    data: {
      content: [
        {
          type: 'h1',
          children: [
            { text: 'Lorem', highlight: '#5eead4' },
            { text: ' ' },
            { text: 'Ipsum', highlight: '#f9a8d4' },
          ],
          id: 'p8ix-c4aj-p9vh-jhjg',
          align: 'center',
        },
        {
          type: 'paragraph',
          children: [
            {
              text: '"Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit..."',
              italic: true,
            },
          ],
          id: 'k9cm-zs5l-cjwa-k8gt',
          align: 'center',
        },
        {
          type: 'paragraph',
          children: [
            {
              text: '"There is no one who loves pain itself, who seeks after it and wants to have it, simply because it is pain..."',
              fontSize: '14px',
            },
          ],
          id: '1hcb-l80v-8vxx-v7iv',
          align: 'center',
        },
        {
          type: 'columns-container',
          children: [
            {
              type: 'column',
              children: [
                {
                  type: 'h3',
                  children: [{ text: 'What is Lorem Ipsum?' }],
                  id: '2e17-27st-xixz-thtd',
                },
                {
                  type: 'paragraph',
                  children: [
                    {
                      text: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.",
                      fontSize: '14px',
                      highlight: '#fef08a',
                    },
                    {
                      text: " It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.",
                      fontSize: '14px',
                    },
                  ],
                  id: 'mo1h-rsuk-r57a-db5q',
                },
                {
                  type: 'h3',
                  children: [{ text: 'Where does it come from?' }],
                  id: 'zaor-5qco-d42i-kft9',
                },
                {
                  type: 'paragraph',
                  children: [
                    {
                      text: 'Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable source. Lorem Ipsum comes from sections 1.10.32 and 1.10.33 of "de Finibus Bonorum et Malorum" (The Extremes of Good and Evil) by Cicero, written in 45 BC. This book is a treatise on the theory of ethics, very popular during the Renaissance. The first line of Lorem Ipsum, "Lorem ipsum dolor sit amet..", comes from a line in section 1.10.32.',
                      fontSize: '14px',
                    },
                  ],
                  id: 'e3fo-d6bv-xrv3-ow7j',
                },
                {
                  type: 'paragraph',
                  children: [
                    {
                      text: 'The standard chunk of Lorem Ipsum used since the 1500s is reproduced below for those interested. Sections 1.10.32 and 1.10.33 from "de Finibus Bonorum et Malorum" by Cicero are also reproduced in their exact original form, accompanied by English versions from the 1914 translation by H. Rackham.',
                      fontSize: '14px',
                    },
                  ],
                  id: 'j7is-nvpa-2h1m-cm73',
                },
              ],
              id: '5vws-py6r-7ftu-58d2',
            },
            {
              type: 'column',
              children: [
                {
                  type: 'h3',
                  children: [{ text: 'Why do we use it?' }],
                  id: 'gr4r-azfh-1v40-ld58',
                },
                {
                  type: 'paragraph',
                  children: [
                    {
                      text: "It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters, as opposed to using 'Content here, content here', making it look like readable English. ",
                      fontSize: '14px',
                    },
                    {
                      text: "Many desktop publishing packages and web page editors now use Lorem Ipsum as their default model text, and a search for 'lorem ipsum' will uncover many web sites still in their infancy.",
                      fontSize: '14px',
                      highlight: '#39ff14',
                    },
                    {
                      text: ' Various versions have evolved over the years, sometimes by accident, sometimes on purpose (injected humour and the like).',
                      fontSize: '14px',
                    },
                  ],
                  id: 'd389-peev-wtbk-45gd',
                },
                {
                  type: 'h3',
                  children: [{ text: 'Where can I get some?' }],
                  id: 'dh7k-of3s-mhmy-atwp',
                },
                {
                  type: 'paragraph',
                  children: [
                    {
                      text: "There are many variations of passages of Lorem Ipsum available, but the majority have suffered alteration in some form, by injected humour, or randomised words which don't look even slightly believable. If you are going to use a passage of Lorem Ipsum, you need to be sure there isn't anything embarrassing hidden in the middle of text. All the Lorem Ipsum generators on the Internet tend to repeat predefined chunks as necessary, making this the first true generator on the Internet. It uses a dictionary of over 200 Latin words, combined with a handful of model sentence structures, to generate Lorem Ipsum which looks reasonable. The generated Lorem Ipsum is therefore always free from repetition, injected humour, or non-characteristic words etc.",
                      fontSize: '14px',
                    },
                  ],
                  id: 'ml0n-ckcc-6ee9-8sbf',
                },
              ],
              id: 're2n-fk8c-83ah-rs9x',
            },
          ],
          id: '25ng-98d7-1hrs-je5l',
        },
        {
          type: 'horizontal_line',
          children: [{ text: '' }],
          id: 'kuo3-q0gq-lpa2-kf2w',
          lineStyle: 'solid',
        },
        {
          type: 'paragraph',
          children: [
            { text: 'Translations:', bold: true, fontSize: '14px' },
            {
              text: " Can you help translate this site into a foreign language ? Please email us with details if you can help.",
              fontSize: '14px',
            },
          ],
          id: 'htfh-u4fj-2lp2-gmd4',
          align: 'center',
        },
        {
          type: 'horizontal_line',
          children: [{ text: '' }],
          id: 'oju7-2cpv-z4a8-gpxf',
          lineStyle: 'solid',
        },
      ],
      images: [],
    },
  },
  // Add more templates here, e.g.:
  // { id: 'blank', name: 'Blank', data: { content: [...], images: [] } },
]

/** Default template used when "Load sample data" is clicked (index 0). */
export const DEFAULT_SAMPLE_TEMPLATE = SAMPLE_TEMPLATES[0]
