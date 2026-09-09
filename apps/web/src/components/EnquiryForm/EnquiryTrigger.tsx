'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import EnquiryForm from './EnquiryForm';

interface EnquiryTriggerProps {
    schemeId?: string;
    schemeName?: string;
    className?: string;
    /** Overrides the default "Have a doubt? Ask us" label. */
    label?: string;
}

/**
 * Button + modal in one client component, so a server-rendered page (the contact
 * page, for instance) can drop in an enquiry entry point without becoming a
 * client component itself.
 */
export default function EnquiryTrigger({ schemeId, schemeName, className, label }: EnquiryTriggerProps) {
    const t = useTranslations('Enquiry');
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button
                type="button"
                className={className || 'btn btn-primary btn-lg'}
                onClick={() => setIsOpen(true)}
            >
                {label || t('askButton')}
            </button>
            <EnquiryForm
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                schemeId={schemeId}
                schemeName={schemeName}
            />
        </>
    );
}
