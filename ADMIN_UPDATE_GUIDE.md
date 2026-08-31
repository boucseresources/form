# Admin Update Guide

ভবিষ্যতের BOU notice অনুযায়ী সাইট update করতে মূলত শুধু **data/site-config.json** file edit করুন।

## Registration notice update

**registrationNotice** অংশে পরিবর্তন করুন:

- **enabled**: বর্তমান preset দেখাতে true
- **term, published, registrationFrom, registrationTo**
- **onlineRegistrationFromSession**: যে session থেকে OSAPS-এ online আবেদন বাধ্যতামূলক (বর্তমানে `2024-25`); এর আগের session manual/offline form ব্যবহার করবে
- **fees**: প্রতি credit, প্রতি course এবং অন্যান্য fee
- **profiles**: সংশ্লিষ্ট semester-এর session, fee হিসাবের credit/course count, class date ও notice total
- **courseCodes**: notice-এ যে courseগুলো offer করা হয়েছে

নতুন semester profile যোগ করার সময় key হবে 1-1, 1-2, 2-1 … 4-2।

## Failed / Improvement notice update

**examNotice** অংশে:

- Notice প্রকাশ হলে **enabled**-কে true করুন
- Term, deadline, final late date ও fee লিখুন
- Re-exam ও improvement fee আলাদাভাবে লিখুন
- Notice link দিন

এরপর শিক্ষার্থীরা form-এ **বর্তমান notice-এর তথ্য বসান** button পাবে। Fresh form নিজে থেকে pre-filled হবে না।

## Video demo ও Quick Help

- **demoVideoUrl**: YouTube watch/share URL অথবা Facebook video URL paste করুন
- **quickHelpUrl**: সাহায্যের Facebook group link

## Deploy

GitHub-এ file update করে push করলে connected Vercel project auto-deploy করবে। Direct upload ব্যবহার করলে updated project folder/ZIP আবার Vercel-এ deploy করুন।

JSON edit করার সময় quotation mark ও comma অক্ষত রাখুন। VS Code-এ ভুল থাকলে file লাল underline দেখাবে।
