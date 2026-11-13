const btnBase =
    'inline-block cursor-pointer rounded-lg border px-3 py-1.5 text-center align-middle text-base leading-normal font-normal select-none disabled:pointer-events-none disabled:opacity-65';

export const bs = {
    link: 'text-[#0d6efd] underline hover:text-[#0a58ca]',
    btnPrimary: `${btnBase} border-[#0d6efd] bg-[#0d6efd] text-white hover:border-[#0a58ca] hover:bg-[#0b5ed7]`,
    btnSecondary: `${btnBase} border-[#6c757d] bg-[#6c757d] text-white hover:border-[#565e64] hover:bg-[#5c636a]`,
    btnOutlineSecondary: `${btnBase} border-[#6c757d] bg-transparent text-[#6c757d] hover:bg-[#6c757d] hover:text-white`,
    btnSuccess: `${btnBase} border-[#198754] bg-[#198754] text-white hover:border-[#146c43] hover:bg-[#157347]`,
    btnDanger: `${btnBase} border-[#dc3545] bg-[#dc3545] text-white hover:border-[#b02a37] hover:bg-[#bb2d3b]`,
    btnWarning: `${btnBase} border-[#ffc107] bg-[#ffc107] text-black hover:border-[#ffc720] hover:bg-[#ffca2c]`,
    btnInfo: `${btnBase} border-[#0dcaf0] bg-[#0dcaf0] text-black hover:border-[#25cff2] hover:bg-[#31d2f2]`,
    btnLight: `${btnBase} border-[#f8f9fa] bg-[#f8f9fa] text-black hover:border-[#c6c7c8] hover:bg-[#d3d4d5]`,
    btnSm: 'rounded px-2 py-1 text-sm',
    btnLg: 'rounded-[0.5rem] px-4 py-2 text-xl',
    formControl:
        'block w-full rounded-lg border border-[#dee2e6] bg-white px-3 py-1.5 text-base leading-normal text-[#212529] focus:border-[#86b7fe] focus:shadow-[0_0_0_0.25rem_rgba(13,110,253,0.25)] focus:outline-none',
    formSelect:
        'block w-full rounded-lg border border-[#dee2e6] bg-white py-1.5 pr-9 pl-3 text-base leading-normal text-[#212529] focus:border-[#86b7fe] focus:shadow-[0_0_0_0.25rem_rgba(13,110,253,0.25)] focus:outline-none',
    formLabel: 'mb-2 inline-block',
    formCheckInput: 'mt-1 size-4 rounded border border-[#dee2e6] align-top accent-[#0d6efd]',
    table: 'mb-4 w-full border-collapse align-top text-[#212529] [&_td]:border-b [&_td]:border-[#dee2e6] [&_td]:p-2 [&_th]:border-b [&_th]:border-[#dee2e6] [&_th]:p-2 [&_th]:font-bold',
    tableStriped: '[&_tbody_tr:nth-of-type(odd)>*]:bg-[rgba(0,0,0,0.05)]',
    tableBordered: '[&_td]:border [&_th]:border',
    tableSm: '[&_td]:p-1 [&_th]:p-1',
    h1: 'mb-2 text-[2.5rem] leading-[1.2] font-medium',
    h2: 'mb-2 text-[2rem] leading-[1.2] font-medium',
    h3: 'mb-2 text-[1.75rem] leading-[1.2] font-medium',
    h4: 'mb-2 text-2xl leading-[1.2] font-medium',
    h5: 'mb-2 text-xl leading-[1.2] font-medium',
    alertDanger: 'mb-4 rounded-lg border border-[#f1aeb5] bg-[#f8d7da] p-4 text-[#58151c]',
    alertWarning: 'mb-4 rounded-lg border border-[#ffe69c] bg-[#fff3cd] p-4 text-[#664d03]',
    alertInfo: 'mb-4 rounded-lg border border-[#9eeaf9] bg-[#cff4fc] p-4 text-[#055160]',
    alertSuccess: 'mb-4 rounded-lg border border-[#a3cfbb] bg-[#d1e7dd] p-4 text-[#0a3622]',
    textSuccess: 'text-[#198754]',
    textDanger: 'text-[#dc3545]',
    textMuted: 'text-[#6c757d]',
};
